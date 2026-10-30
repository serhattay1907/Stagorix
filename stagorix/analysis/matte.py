"""Person mattes for speaker effects (background blur or swap, outline glow, colour pop).

Two qualities, so previews stay fast and finals stay clean (owner's choice, option C):

- draft: MediaPipe selfie segmentation (Apache-2.0), ~4 ms per frame on CPU, softer edges
- final: U²-Net human segmentation, ~400 ms per frame, cleaner hair and fingers

Only the seconds that need a matte are processed: the ranges of speaker effects in the
edit plan (or the whole clip for a draft). Mattes are small greyscale PNGs (540x960), one
per source frame, named by frame number; the renderer uses them as a CSS mask over the
footage, so no full-size RGBA frames are written.
"""

from __future__ import annotations

from collections.abc import Callable
from enum import StrEnum
from pathlib import Path

import numpy as np
from pydantic import BaseModel, Field

from stagorix import models
from stagorix.analysis.video import iter_frames, probe

MATTE_SIZE = (540, 960)  # width, height; scaled up by the renderer
PAD = 0.25  # seconds of matte before and after each effect, for its fades
INDEX = "matte.json"


class Quality(StrEnum):
    DRAFT = "draft"
    FINAL = "final"


class Matte(BaseModel):
    source: str
    quality: Quality
    model: str
    fps: float
    frames: int = Field(ge=0, description="Frames in the source; masks exist only inside `ranges`")
    ranges: list[tuple[float, float]] = Field(description="Seconds covered, merged and padded")
    written: int = Field(ge=0)


def merge_ranges(ranges: list[tuple[float, float]], pad: float = PAD) -> list[tuple[float, float]]:
    """Pad each range, clamp at zero and merge overlaps, in time order."""
    out: list[tuple[float, float]] = []
    for a, b in sorted((max(0.0, a - pad), b + pad) for a, b in ranges):
        if out and a <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], b))
        else:
            out.append((a, b))
    return out


def _selfie_mask(session, frame_bgr: np.ndarray) -> np.ndarray:  # type: ignore[no-untyped-def]
    import cv2

    rgb = cv2.cvtColor(cv2.resize(frame_bgr, (256, 256), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    x = (rgb.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
    alpha = session.run(None, {session.get_inputs()[0].name: x})[0].reshape(256, 256)
    mask = cv2.resize(alpha, MATTE_SIZE, interpolation=cv2.INTER_LINEAR)
    return np.clip(mask * 255, 0, 255).astype(np.uint8)


def _masker(quality: Quality) -> tuple[Callable[[np.ndarray], np.ndarray], str]:
    import cv2
    import onnxruntime as ort

    if quality is Quality.DRAFT:
        session = ort.InferenceSession(str(models.ensure_selfie()), providers=["CPUExecutionProvider"])
        return (lambda f: _selfie_mask(session, f)), models.SELFIE.name
    from stagorix.analysis.cutout import _session, person_mask

    u2 = _session()
    return (
        lambda f: cv2.resize(person_mask(u2, f), MATTE_SIZE, interpolation=cv2.INTER_AREA)
    ), models.U2NET.name


def write_mattes(
    video: Path,
    out_dir: Path,
    quality: Quality = Quality.DRAFT,
    ranges: list[tuple[float, float]] | None = None,
    on_progress: Callable[[float], None] | None = None,
) -> Matte:
    """Write <frame>.png masks for the frames inside `ranges` (all frames when None)."""
    import cv2

    info = probe(video)
    total = info.frames / info.fps if info.fps else 0.0
    spans = merge_ranges(ranges, PAD) if ranges is not None else [(0.0, total)]
    wanted = [(round(a * info.fps), round(b * info.fps)) for a, b in spans]
    count = sum(max(0, min(b, info.frames) - a) for a, b in wanted)
    out_dir.mkdir(parents=True, exist_ok=True)
    mask_of, model = _masker(quality)
    written = 0
    last = max((b for _, b in wanted), default=0)
    for i, frame in enumerate(iter_frames(video, info, width=MATTE_SIZE[0])):
        if i >= last:
            break
        if not any(a <= i < b for a, b in wanted):
            continue
        cv2.imwrite(str(out_dir / f"{i:05d}.png"), mask_of(frame), [cv2.IMWRITE_PNG_COMPRESSION, 6])
        written += 1
        if on_progress and count:
            on_progress(written / count)
    matte = Matte(
        source=video.name,
        quality=quality,
        model=model,
        fps=round(info.fps, 3),
        frames=info.frames,
        ranges=[(round(a, 3), round(b, 3)) for a, b in spans],
        written=written,
    )
    (out_dir / INDEX).write_text(matte.model_dump_json(indent=2), encoding="utf-8")
    return matte


SPEAKER_COMPONENT = "SpeakerFx"


def plan_ranges(plan) -> list[tuple[float, float]]:  # type: ignore[no-untyped-def]
    """Seconds of an edit plan that need a person matte: its speaker effects."""
    from stagorix.render.motion import CATALOG

    return [
        (e.at, e.at + e.seconds)
        for e in plan.effects
        if e.effect in CATALOG and CATALOG[e.effect].component == SPEAKER_COMPONENT
    ]
