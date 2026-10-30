from pathlib import Path

from stagorix.render.motion import CATALOG, LAYERS, EditPlan, MotionRules, PlannedEffect, Severity, check_plan

ROOT = Path(__file__).resolve().parents[1]


def plan(*effects: tuple[str, float, float], duration: float = 30) -> EditPlan:
    return EditPlan(
        duration=duration,
        effects=[PlannedEffect(effect=e, at=a, seconds=s, reason="test") for e, a, s in effects],
    )


def rules_of(found) -> list[str]:  # type: ignore[no-untyped-def]
    return [v.rule for v in found]


def test_every_effect_component_is_in_the_catalog() -> None:
    components = {p.stem for p in (ROOT / "render/src/effects").glob("*.tsx")}
    covered = {s.component for s in CATALOG.values()} | LAYERS
    assert components <= covered, f"missing from CATALOG: {components - covered}"


def test_showcase_plan_follows_the_rules() -> None:
    p = EditPlan.model_validate_json((ROOT / "examples/plans/showcase.json").read_text(encoding="utf-8"))
    assert check_plan(p) == []


def test_missing_hook_and_outro_are_flagged() -> None:
    found = check_plan(plan(("camera.zoom", 5, 1)))
    assert rules_of(found) == ["hook", "outro"]


def test_effects_too_close_together() -> None:
    found = check_plan(
        plan(("title.behind", 0, 2), ("camera.zoom", 5, 1), ("camera.whip", 6, 0.4), ("outro.card", 25, 5))
    )
    assert rules_of(found) == ["spacing"]
    assert found[0].at == 6


def test_same_effect_repeating_too_soon() -> None:
    found = check_plan(
        plan(("title.behind", 0, 2), ("camera.zoom", 5, 1), ("camera.zoom", 9, 1), ("outro.card", 25, 5))
    )
    assert rules_of(found) == ["repeat"]


def test_strong_effect_budget() -> None:
    whips = [("camera.whip", t, 0.4) for t in (5, 12, 19)]
    found = check_plan(plan(("title.behind", 0, 2), *whips, ("outro.card", 25, 5), duration=30))
    assert rules_of(found) == ["strong-budget"]  # 3 whips after the hook, budget 2 for 30 s


def test_layers_on_one_beat_are_not_a_spacing_problem() -> None:
    found = check_plan(
        plan(("title.behind", 0, 2), ("camera.whip", 5, 0.4), ("grade.leak", 5.1, 0.8), ("outro.card", 25, 5))
    )
    assert found == []


def test_unknown_and_non_signature_effects_are_errors() -> None:
    rules = MotionRules(signature=["title.behind", "outro.card"])
    found = check_plan(
        plan(("title.behind", 0, 2), ("sparkles", 4, 1), ("camera.zoom", 8, 1), ("outro.card", 25, 5)), rules
    )
    errors = [v.rule for v in found if v.severity is Severity.ERROR]
    assert errors == ["unknown-effect", "not-signature"]


def test_effect_past_the_end_is_an_error() -> None:
    found = check_plan(plan(("title.behind", 0, 2), ("outro.card", 27, 5)))
    assert [v.rule for v in found if v.severity is Severity.ERROR] == ["past-end"]


def test_no_render_source_is_gitignored() -> None:
    """A source file matched by .gitignore never reaches the repo or the Docker image."""
    import shutil
    import subprocess

    import pytest

    if shutil.which("git") is None or not (ROOT / ".git").exists():
        pytest.skip("needs a git checkout")
    out = subprocess.run(
        ["git", "ls-files", "--others", "--ignored", "--exclude-standard", "render/src", "stagorix", "tests"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    ignored = [p for p in out.splitlines() if "__pycache__" not in p]
    assert not ignored, ignored
