"""Stream video frames through ffmpeg pipes, one frame in memory at a time.

The pilot loaded every frame into RAM and passed 7 GB on a short clip.
"""

from __future__ import annotations

import json
import subprocess
from collections.abc import Iterator
from pathlib import Path

import numpy as np
from pydantic import BaseModel

from stagorix.analysis.media import MediaError, _ffmpeg


class VideoInfo(BaseModel):
    width: int
    height: int
    fps: float
    frames: int
    has_audio: bool


def _ffprobe() -> str:
    import shutil

    path = shutil.which("ffprobe")
    if path is None:
        raise MediaError("ffprobe not found on PATH; run 'stagorix doctor'")
    return path


def probe(path: Path) -> VideoInfo:
    if not path.exists():
        raise MediaError(f"input not found: {path}")
    result = subprocess.run(
        [_ffprobe(), "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise MediaError(f"ffprobe could not read {path.name}: {result.stderr.strip()}")
    data = json.loads(result.stdout)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise MediaError(f"{path.name} has no video stream")
    num, den = video.get("avg_frame_rate", "0/1").split("/")
    fps = float(num) / float(den) if float(den) else 0.0
    if fps <= 0:
        num, den = video["r_frame_rate"].split("/")
        fps = float(num) / float(den)
    duration = float(video.get("duration") or data["format"].get("duration") or 0)
    frames = int(video.get("nb_frames") or round(duration * fps))
    # Rotation metadata (phones) swaps the displayed width and height.
    rotation = 0
    for side in video.get("side_data_list", []):
        rotation = int(side.get("rotation", rotation))
    w, h = int(video["width"]), int(video["height"])
    if abs(rotation) in (90, 270):
        w, h = h, w
    has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    return VideoInfo(width=w, height=h, fps=fps, frames=frames, has_audio=has_audio)


def iter_frames(path: Path, info: VideoInfo, width: int | None = None) -> Iterator[np.ndarray]:
    """Yield BGR frames, optionally scaled to `width` (aspect kept, even height)."""
    out_w = width or info.width
    out_h = round(info.height * out_w / info.width / 2) * 2
    cmd = [_ffmpeg(), "-v", "error", "-i", str(path), "-an"]
    if width:
        cmd += ["-vf", f"scale={out_w}:{out_h}"]
    cmd += ["-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    size = out_w * out_h * 3
    assert proc.stdout is not None
    try:
        while True:
            buf = proc.stdout.read(size)
            if len(buf) < size:
                break
            yield np.frombuffer(buf, np.uint8).reshape(out_h, out_w, 3)
    finally:
        proc.stdout.close()
        proc.wait()


class VideoWriter:
    """Encode BGR frames to H.264, copying audio from `audio_from` when present."""

    def __init__(self, out: Path, width: int, height: int, fps: float, audio_from: Path | None = None):
        cmd = [_ffmpeg(), "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24"]
        cmd += ["-s", f"{width}x{height}", "-r", f"{fps}", "-i", "-"]
        if audio_from is not None:
            cmd += ["-i", str(audio_from), "-map", "0:v", "-map", "1:a?", "-c:a", "aac", "-b:a", "192k"]
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"]
        cmd += ["-shortest", str(out)]
        self._proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    def write(self, frame: np.ndarray) -> None:
        assert self._proc.stdin is not None
        self._proc.stdin.write(frame.tobytes())

    def close(self) -> None:
        _, err = self._proc.communicate()
        if self._proc.returncode != 0:
            raise MediaError(f"ffmpeg encoding failed: {err.decode(errors='replace').strip()}")
