"""Voice clean-up: rumble filter, gentle compression, loudness normalisation.

The final mix is normalised again to the platform target in phase 3.6;
this step prepares a clean, consistent voice track for editing.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from stagorix.analysis.media import MediaError, _ffmpeg
from stagorix.analysis.models import VoiceTrack

TARGET_LUFS = -16.0
CHAIN = (
    "highpass=f=80,"
    "acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,"
    f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11"
)


def measure_lufs(path: Path) -> float:
    """Integrated loudness in LUFS, measured by ffmpeg's loudnorm analyser."""
    result = subprocess.run(
        [
            _ffmpeg(),
            "-hide_banner",
            "-i",
            str(path),
            "-vn",
            "-af",
            "loudnorm=print_format=json",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", result.stderr)
    if result.returncode != 0 or match is None:
        raise MediaError(f"could not measure loudness of {path.name}")
    return float(json.loads(match.group(0))["input_i"])


def clean_voice(source: Path, out: Path) -> VoiceTrack:
    before = measure_lufs(source)
    result = subprocess.run(
        [_ffmpeg(), "-v", "error", "-y", "-i", str(source), "-vn", "-ac", "2", "-ar", "48000"]
        + ["-af", CHAIN, str(out)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise MediaError(f"voice clean-up failed: {result.stderr.strip()}")
    return VoiceTrack(
        source=source.name,
        lufs_before=round(before, 1),
        lufs_after=round(measure_lufs(out), 1),
        target_lufs=TARGET_LUFS,
    )
