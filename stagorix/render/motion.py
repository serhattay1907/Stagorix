"""Motion language: why an effect appears, how loud it is, and how often it may appear.

Every effect in the library has a role (hook, emphasis, transition, info, outro) and an
intensity (subtle, medium, strong), the way design systems split motion into calm and
expressive tiers. A brand sets the rules (spacing, budget of strong effects, signature
effects); an edit plan is checked against them before rendering, and every effect in a
plan carries the reason it is there, so the user can judge it (principle 3).
"""

from __future__ import annotations

import math
from enum import StrEnum

from pydantic import BaseModel, Field

BEAT = 0.3  # seconds; effects starting this close together share one beat


class Role(StrEnum):
    HOOK = "hook"  # grabs attention in the opening seconds
    EMPHASIS = "emphasis"  # underlines a word, number or idea
    TRANSITION = "transition"  # marks a change of section
    INFO = "info"  # shows structured information (label, card, list)
    OUTRO = "outro"  # closing card and call to action


class Intensity(StrEnum):
    SUBTLE = "subtle"
    MEDIUM = "medium"
    STRONG = "strong"


class EffectSpec(BaseModel):
    id: str = Field(description="Matches the Remotion component, e.g. camera.zoom")
    component: str = Field(description="File in render/src/effects/ that implements it")
    role: Role
    intensity: Intensity
    min_seconds: float = Field(gt=0)
    max_seconds: float = Field(gt=0)


# The library. Each effect component in render/src/effects/ must appear here (checked by tests).
CATALOG: dict[str, EffectSpec] = {
    s.id: s
    for s in [
        EffectSpec(
            id="title.behind",
            component="TitleBehind",
            role=Role.HOOK,
            intensity=Intensity.STRONG,
            min_seconds=1.5,
            max_seconds=4,
        ),
        EffectSpec(
            id="camera.zoom",
            component="Camera",
            role=Role.EMPHASIS,
            intensity=Intensity.MEDIUM,
            min_seconds=0.5,
            max_seconds=3,
        ),
        EffectSpec(
            id="camera.whip",
            component="Camera",
            role=Role.TRANSITION,
            intensity=Intensity.STRONG,
            min_seconds=0.3,
            max_seconds=0.6,
        ),
        EffectSpec(
            id="camera.shake",
            component="Camera",
            role=Role.EMPHASIS,
            intensity=Intensity.MEDIUM,  # short (0.45 s) and small; strong would eat the budget
            min_seconds=0.3,
            max_seconds=0.6,
        ),
        EffectSpec(
            id="emoji.pop",
            component="EmojiPop",
            role=Role.EMPHASIS,
            intensity=Intensity.SUBTLE,
            min_seconds=0.6,
            max_seconds=2,
        ),
        EffectSpec(
            id="number.pop",
            component="NumberPop",
            role=Role.EMPHASIS,
            intensity=Intensity.MEDIUM,
            min_seconds=1.5,
            max_seconds=3.5,
        ),
        EffectSpec(
            id="transition.glitch",
            component="Transition",
            role=Role.TRANSITION,
            intensity=Intensity.STRONG,
            min_seconds=0.3,
            max_seconds=0.6,
        ),
        EffectSpec(
            id="transition.iris",
            component="Transition",
            role=Role.TRANSITION,
            intensity=Intensity.MEDIUM,
            min_seconds=0.4,
            max_seconds=0.9,
        ),
        EffectSpec(
            id="transition.zoomblur",
            component="Transition",
            role=Role.TRANSITION,
            intensity=Intensity.MEDIUM,
            min_seconds=0.3,
            max_seconds=0.7,
        ),
        EffectSpec(
            id="label",
            component="Label",
            role=Role.INFO,
            intensity=Intensity.SUBTLE,
            min_seconds=1,
            max_seconds=4,
        ),
        EffectSpec(
            id="grade.leak",
            component="Grade",
            role=Role.TRANSITION,
            intensity=Intensity.SUBTLE,
            min_seconds=0.5,
            max_seconds=1.2,
        ),
        EffectSpec(
            id="chart.bar",
            component="BarChart",
            role=Role.INFO,
            intensity=Intensity.MEDIUM,
            min_seconds=2.5,
            max_seconds=6,
        ),
        EffectSpec(
            id="chart.line",
            component="LineChart",
            role=Role.INFO,
            intensity=Intensity.MEDIUM,
            min_seconds=2.5,
            max_seconds=6,
        ),
        EffectSpec(
            id="compare.versus",
            component="Versus",
            role=Role.INFO,
            intensity=Intensity.MEDIUM,
            min_seconds=2.5,
            max_seconds=6,
        ),
        EffectSpec(
            id="stats.row",
            component="StatRow",
            role=Role.INFO,
            intensity=Intensity.SUBTLE,
            min_seconds=2,
            max_seconds=5,
        ),
        EffectSpec(
            id="outro.card",
            component="Outro",
            role=Role.OUTRO,
            intensity=Intensity.MEDIUM,
            min_seconds=2.5,
            max_seconds=8,
        ),
    ]
}
# Captions run under the whole video, so they are a layer, not a planned effect.
LAYERS = {"Captions"}


class MotionRules(BaseModel):
    """Set per brand (phase 4); these defaults are a starting point, to be tuned with real videos."""

    hook_within: float = Field(default=1.0, description="A hook effect must start this early (s)")
    min_gap: float = Field(default=2.5, description="Seconds between two emphasis or transition effects")
    same_effect_gap: float = Field(default=6.0, description="Seconds before the same effect repeats")
    strong_per_minute: int = Field(default=4, ge=0, description="Budget of strong effects per minute")
    outro_required: bool = True
    signature: list[str] = Field(default_factory=list, description="Allowed effect ids; empty = all")


class PlannedEffect(BaseModel):
    effect: str
    at: float = Field(ge=0)
    seconds: float = Field(gt=0)
    reason: str = Field(min_length=1, description="Why it is here, shown to the user")


class EditPlan(BaseModel):
    duration: float = Field(gt=0)
    effects: list[PlannedEffect]


class Severity(StrEnum):
    ERROR = "error"  # breaks the plan; must be fixed
    WARNING = "warning"  # allowed, but the user should look


class Violation(BaseModel):
    rule: str
    at: float
    severity: Severity
    message: str


def check_plan(plan: EditPlan, rules: MotionRules | None = None) -> list[Violation]:
    """Return every rule the plan breaks, in time order. An empty list means the plan is clean."""
    rules = rules or MotionRules()
    out: list[Violation] = []

    def add(rule: str, at: float, severity: Severity, message: str) -> None:
        out.append(Violation(rule=rule, at=round(at, 2), severity=severity, message=message))

    effects = sorted(plan.effects, key=lambda e: e.at)
    known: list[tuple[PlannedEffect, EffectSpec]] = []
    for e in effects:
        spec = CATALOG.get(e.effect)
        if spec is None:
            add("unknown-effect", e.at, Severity.ERROR, f"'{e.effect}' is not in the effect library")
            continue
        if rules.signature and e.effect not in rules.signature:
            add("not-signature", e.at, Severity.ERROR, f"'{e.effect}' is not one of the brand's effects")
        if not spec.min_seconds <= e.seconds <= spec.max_seconds:
            add(
                "duration",
                e.at,
                Severity.WARNING,
                f"'{e.effect}' lasts {e.seconds:g}s; usual range {spec.min_seconds:g}–{spec.max_seconds:g}s",
            )
        if e.at + e.seconds > plan.duration + 0.01:
            add("past-end", e.at, Severity.ERROR, f"'{e.effect}' runs past the end of the video")
        known.append((e, spec))

    hooks = [e for e, s in known if s.role is Role.HOOK]
    if not hooks or hooks[0].at > rules.hook_within:
        add("hook", 0, Severity.WARNING, f"no hook effect in the first {rules.hook_within:g}s")

    # Effects starting within BEAT seconds of each other are layered on one beat (a whip with a
    # light leak); spacing is measured between beats, not between layers.
    paced = [e for e, s in known if s.role in (Role.EMPHASIS, Role.TRANSITION)]
    beats: list[PlannedEffect] = []
    for e in paced:
        if not beats or e.at - beats[-1].at > BEAT:
            beats.append(e)
    for a, b in zip(beats, beats[1:], strict=False):
        if b.at - a.at < rules.min_gap:
            gap = b.at - a.at
            add(
                "spacing",
                b.at,
                Severity.WARNING,
                f"'{b.effect}' comes {gap:.1f}s after '{a.effect}' (rule: ≥ {rules.min_gap:g}s)",
            )

    last_seen: dict[str, float] = {}
    for e, _ in known:
        if e.effect in last_seen and e.at - last_seen[e.effect] < rules.same_effect_gap:
            gap = e.at - last_seen[e.effect]
            add(
                "repeat",
                e.at,
                Severity.WARNING,
                f"'{e.effect}' repeats after {gap:.1f}s (rule: ≥ {rules.same_effect_gap:g}s)",
            )
        last_seen[e.effect] = e.at

    # The hook is always allowed; the budget covers strong effects after it.
    strong = [e for e, s in known if s.intensity is Intensity.STRONG and s.role is not Role.HOOK]
    budget = math.ceil(rules.strong_per_minute * plan.duration / 60)
    if len(strong) > budget:
        add(
            "strong-budget",
            strong[budget].at,
            Severity.WARNING,
            f"{len(strong)} strong effects after the hook; budget for {plan.duration:.0f}s is {budget}",
        )

    if rules.outro_required and not any(s.role is Role.OUTRO for _, s in known):
        add("outro", plan.duration, Severity.WARNING, "no outro (closing card or call to action)")

    return sorted(out, key=lambda v: v.at)
