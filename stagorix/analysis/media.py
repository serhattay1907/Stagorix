"""ffmpeg helpers shared by analysis steps."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import numpy as np

SAMPLE_RATE = 16_000


class MediaError(RuntimeError):
    """ffmpeg is missing or could not read the input."""


def _ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if path is None:
        raise MediaError("ffmpeg not found on PATH; run 'stagorix doctor'")
    return path


def decode_audio(path: Path) -> np.ndarray:
    """Decode any input to 16 kHz mono float32 in [-1, 1].

    Decoding with ffmpeg avoids PyAV version issues seen in the pilot.
    """
    if not path.exists():
        raise MediaError(f"input not found: {path}")
    result = subprocess.run(
        [
            _ffmpeg(),
            "-v",
            "error",
            "-i",
            str(path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            "-f",
            "s16le",
            "-",
        ],
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise MediaError(
            f"ffmpeg could not decode {path.name}: {result.stderr.decode(errors='replace').strip()}"
        )
    return np.frombuffer(result.stdout, np.int16).astype(np.float32) / 32768.0
