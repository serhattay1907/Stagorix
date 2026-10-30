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


def clean_mask(mask: np.ndarray) -> np.ndarray:
    """Tighten a raw matte: steeper edge, no faint haze over the background, no loose blobs.

    Faint values far from the person made glows and moves paint over background objects;
    a soft fringe made halos. Keeps every blob that is at least 1.5 % of the frame.
    """
    import cv2

    m = mask.astype(np.float32) / 255.0
    m = np.clip((m - 0.3) / 0.4, 0.0, 1.0)
    m = m * m * (3 - 2 * m)  # smoothstep
    solid = (m > 0.5).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
    keep = np.zeros_like(solid)
    min_area = 0.015 * solid.size
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            keep[labels == i] = 1
    keep = cv2.dilate(keep, np.ones((9, 9), np.uint8))
    m = m * keep
    m = cv2.erode(m, np.ones((3, 3), np.uint8))
    m = cv2.GaussianBlur(m, (0, 0), 1.2)
    return np.clip(m * 255, 0, 255).astype(np.uint8)


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
        cv2.imwrite(
            str(out_dir / f"{i:05d}.png"), clean_mask(mask_of(frame)), [cv2.IMWRITE_PNG_COMPRESSION, 6]
        )
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


def write_plate(video: Path, matte_dir: Path, out: Path, samples: int = 24) -> Path:
    """A clean plate: the background without the speaker, for effects that move or blur it.

    Takes the per-pixel median of background pixels over sampled frames (the speaker moves,
    so most of the background shows up in some frame) and inpaints what is never visible.
    Blur and camera moves then show this plate instead of a background with the speaker in it,
    so no halo or ghost of the speaker appears.
    """
    import cv2

    info = probe(video)
    have = sorted(int(p.stem) for p in matte_dir.glob("*.png"))
    if not have:
        raise FileNotFoundError(f"no mattes in {matte_dir}")
    picks = set(have[:: max(1, len(have) // samples)][:samples])
    stack: list[np.ndarray] = []
    for i, frame in enumerate(iter_frames(video, info, width=MATTE_SIZE[0])):
        if i > max(picks):
            break
        if i not in picks:
            continue
        mask = cv2.imread(str(matte_dir / f"{i:05d}.png"), cv2.IMREAD_GRAYSCALE)
        person = cv2.dilate((mask > 20).astype(np.uint8), np.ones((31, 31), np.uint8)).astype(bool)
        f = cv2.resize(frame, MATTE_SIZE, interpolation=cv2.INTER_AREA).astype(np.float32)
        f[person] = np.nan
        stack.append(f)
    import warnings

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN pixels are filled below
        plate = np.nanmedian(np.stack(stack), axis=0)
    hole = np.isnan(plate).any(axis=2)
    plate = np.nan_to_num(plate).astype(np.uint8)
    if hole.any():
        plate = cv2.inpaint(plate, hole.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), plate, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return out
