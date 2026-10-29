"""Face tracking and a smooth 9:16 virtual camera.

Faces are detected with OpenCV YuNet on downscaled, sampled frames. The crop
centre follows the face through a two-way exponential filter, so the camera
moves slowly and without jitter. If no face is found, the crop stays centred
and the result says so (principle 3).
"""

from __future__ import annotations

import math
from collections.abc import Callable
from pathlib import Path

import numpy as np

from stagorix import models
from stagorix.analysis.models import FaceDetection, FaceTrack
from stagorix.analysis.video import VideoInfo, VideoWriter, iter_frames, probe

DETECT_WIDTH = 640
SAMPLE_EVERY_S = 0.1
MIN_SCORE = 0.7
FOLLOW_SECONDS = 0.5
TARGET_W, TARGET_H = 1080, 1920


def crop_width_for(info: VideoInfo) -> int:
    """Width of a full-height 9:16 window, capped at the frame width, even."""
    return min(info.width, round(info.height * 9 / 16 / 2) * 2)


def smooth(values: np.ndarray, fps: float, seconds: float = FOLLOW_SECONDS) -> np.ndarray:
    """Two-way exponential smoothing with a time constant in seconds (fps-independent)."""
    alpha = 1 - math.exp(-1 / max(fps * seconds, 1e-6))
    out = values.astype(float).copy()
    for i in range(1, len(out)):
        out[i] = out[i - 1] + alpha * (out[i] - out[i - 1])
    for i in range(len(out) - 2, -1, -1):
        out[i] = out[i + 1] + alpha * (out[i] - out[i + 1])
    return out


def crop_positions(centres: np.ndarray, info: VideoInfo) -> list[int]:
    """Left edge of the crop for every frame, from per-frame face centres (NaN = unknown)."""
    cw = crop_width_for(info)
    n = len(centres)
    known = ~np.isnan(centres)
    if not known.any():
        filled = np.full(n, info.width / 2)
    else:
        idx = np.arange(n)
        filled = np.interp(idx, idx[known], centres[known])
    x = smooth(filled, info.fps) - cw / 2
    return [int(v) for v in np.clip(np.round(x), 0, info.width - cw)]


def detect_faces(
    path: Path, info: VideoInfo, on_progress: Callable[[float], None] | None = None
) -> list[FaceDetection]:
    import cv2

    scale = DETECT_WIDTH / info.width if info.width > DETECT_WIDTH else 1.0
    w = round(info.width * scale)
    h = round(info.height * scale / 2) * 2
    detector = cv2.FaceDetectorYN.create(str(models.ensure_yunet()), "", (w, h), MIN_SCORE)
    step = max(1, round(info.fps * SAMPLE_EVERY_S))
    found: list[FaceDetection] = []
    for i, frame in enumerate(iter_frames(path, info, width=w if scale < 1 else None)):
        if i % step == 0:
            _, faces = detector.detect(frame)
            if faces is not None and len(faces):
                x, y, fw, fh, *_, score = max(faces, key=lambda f: f[2] * f[3])
                found.append(
                    FaceDetection(
                        frame=i,
                        x=round(float(x) / scale, 1),
                        y=round(float(y) / scale, 1),
                        w=round(float(fw) / scale, 1),
                        h=round(float(fh) / scale, 1),
                        score=round(float(score), 3),
                    )
                )
        if on_progress and info.frames and i % 30 == 0:
            on_progress(min(i / info.frames, 1.0))
    if on_progress:
        on_progress(1.0)
    return found


def track_faces(path: Path, on_progress: Callable[[float], None] | None = None) -> FaceTrack:
    info = probe(path)
    detections = detect_faces(path, info, on_progress)
    centres = np.full(info.frames, np.nan)
    for d in detections:
        if d.frame < info.frames:
            centres[d.frame] = d.x + d.w / 2
    step = max(1, round(info.fps * SAMPLE_EVERY_S))
    sampled = len(range(0, info.frames, step))
    return FaceTrack(
        source=path.name,
        width=info.width,
        height=info.height,
        fps=round(info.fps, 3),
        frames=info.frames,
        sample_every=step,
        detections=detections,
        face_ratio=round(len(detections) / sampled, 3) if sampled else 0.0,
        crop_width=crop_width_for(info),
        crop_x=crop_positions(centres, info),
    )


def fit_to_target(crop: np.ndarray, cv2) -> np.ndarray:  # type: ignore[no-untyped-def]
    """Scale a crop into 1080×1920 without distortion; pad if it is narrower than 9:16."""
    h, w = crop.shape[:2]
    scale = min(TARGET_W / w, TARGET_H / h)
    nw, nh = round(w * scale), round(h * scale)
    resized = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_LANCZOS4)
    if (nw, nh) == (TARGET_W, TARGET_H):
        return resized
    canvas = np.zeros((TARGET_H, TARGET_W, 3), np.uint8)
    top, left = (TARGET_H - nh) // 2, (TARGET_W - nw) // 2
    canvas[top : top + nh, left : left + nw] = resized
    return canvas


def render_vertical(
    path: Path, track: FaceTrack, out: Path, on_progress: Callable[[float], None] | None = None
) -> Path:
    """Write a 1080×1920 video that follows the tracked face; audio is kept."""
    import cv2

    info = probe(path)
    cw = track.crop_width
    writer = VideoWriter(out, TARGET_W, TARGET_H, info.fps, audio_from=path if info.has_audio else None)
    try:
        for i, frame in enumerate(iter_frames(path, info)):
            x = track.crop_x[min(i, len(track.crop_x) - 1)]
            writer.write(fit_to_target(frame[:, x : x + cw], cv2))
            if on_progress and info.frames and i % 30 == 0:
                on_progress(min(i / info.frames, 1.0))
    finally:
        writer.close()
    if on_progress:
        on_progress(1.0)
    return out
