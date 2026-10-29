"""Person cutout for the opening seconds, so titles can sit behind the speaker.

Runs U²-Net (human segmentation) directly with onnxruntime on the vertical
video and writes RGBA PNG frames. Only the hook is cut out: on CPU this is
the slowest analysis step (the pilot measured ~1.6 s per frame).
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

import numpy as np

from stagorix import models
from stagorix.analysis.models import Cutout
from stagorix.analysis.video import iter_frames, probe

INPUT = 320
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)


def _session():  # type: ignore[no-untyped-def]
    import onnxruntime as ort

    available = ort.get_available_providers()
    providers = [p for p in ("CUDAExecutionProvider", "CPUExecutionProvider") if p in available]
    return ort.InferenceSession(str(models.ensure_u2net()), providers=providers)


def person_mask(session, frame_bgr: np.ndarray) -> np.ndarray:  # type: ignore[no-untyped-def]
    """Return a 0..255 uint8 mask the size of the frame (255 = person)."""
    import cv2

    h, w = frame_bgr.shape[:2]
    rgb = cv2.cvtColor(cv2.resize(frame_bgr, (INPUT, INPUT), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    x = rgb.astype(np.float32) / max(float(rgb.max()), 1e-6)
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
    pred = session.run(None, {session.get_inputs()[0].name: x})[0][0, 0]
    lo, hi = float(pred.min()), float(pred.max())
    pred = (pred - lo) / (hi - lo) if hi > lo else np.zeros_like(pred)
    mask = cv2.resize(pred, (w, h), interpolation=cv2.INTER_LINEAR)
    mask = cv2.GaussianBlur(mask, (0, 0), 1.5)
    return np.clip(mask * 255, 0, 255).astype(np.uint8)


def cut_out(
    vertical: Path,
    out_dir: Path,
    seconds: float,
    on_progress: Callable[[float], None] | None = None,
) -> Cutout:
    """Write RGBA frames 0000.png… for the first `seconds` of `vertical`."""
    import cv2

    info = probe(vertical)
    count = min(info.frames, round(seconds * info.fps))
    out_dir.mkdir(parents=True, exist_ok=True)
    session = _session()
    coverage: list[float] = []
    for i, frame in enumerate(iter_frames(vertical, info)):
        if i >= count:
            break
        mask = person_mask(session, frame)
        coverage.append(float((mask > 127).mean()))
        cv2.imwrite(str(out_dir / f"{i:04d}.png"), np.dstack([frame, mask]), [cv2.IMWRITE_PNG_COMPRESSION, 3])
        if on_progress and count:
            on_progress((i + 1) / count)
    return Cutout(
        source=vertical.name,
        frames=len(coverage),
        fps=round(info.fps, 3),
        model=models.U2NET.name,
        person_ratio=round(float(np.mean(coverage)) if coverage else 0.0, 3),
    )
