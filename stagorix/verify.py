"""Golden test: render a fixed composition and compare it with committed references.

The references in tests/golden/ are produced inside the Docker image, which is
the canonical environment on every OS (principle 2). Natively rendered frames
may differ slightly because system fonts differ; the result says so.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import time
from pathlib import Path

from pydantic import BaseModel

from stagorix.doctor import in_container

ROOT = Path(__file__).resolve().parents[1]
RENDER_DIR = ROOT / "render"
GOLDEN_DIR = ROOT / "tests" / "golden"
OUT_DIR = ROOT / "workspace" / "verify"

COMPOSITION = "Placeholder"  # also rendered as a video for the format check
# Stills compared with tests/golden/<composition>-<frame>.png.
STILLS = {"Placeholder": (10, 45, 89), "Showcase": (40, 170, 270, 420)}
EXPECTED = {"width": 1080, "height": 1920, "fps": 30.0, "frames": 90}
MIN_SSIM = 0.99

SPEECH_FIXTURE = "speech-en.opus"
SPEECH_TEXT = "The quick brown fox jumps over the lazy dog. Every video starts with a single frame."
MIN_WORD_MATCH = 0.9


class Step(BaseModel):
    name: str
    ok: bool
    detail: str
    seconds: float


class VerifyError(RuntimeError):
    """A tool needed by the golden test is missing or failed."""


def _tool(name: str) -> str:
    path = shutil.which(name)
    if path is None:
        raise VerifyError(f"'{name}' not found on PATH")
    return path


def _run(cmd: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        tail = (result.stderr or result.stdout).strip().splitlines()[-5:]
        raise VerifyError(f"{Path(cmd[0]).name} failed:\n" + "\n".join(tail))
    return result


def _remotion(args: list[str], browser: str | None) -> None:
    cmd = [_tool("npx"), "remotion", *args, "--log=error"]
    if browser:
        cmd.append(f"--browser-executable={browser}")
    _run(cmd, cwd=RENDER_DIR)


def _still(composition: str, frame: int) -> str:
    return f"{composition.lower()}-{frame:03d}.png"


def _ssim(a: Path, b: Path) -> float:
    result = _run(
        [_tool("ffmpeg"), "-hide_banner", "-i", str(a), "-i", str(b), "-lavfi", "ssim", "-f", "null", "-"]
    )
    match = re.search(r"All:([0-9.]+)", result.stderr)
    if match is None:
        raise VerifyError("could not read SSIM from ffmpeg output")
    return float(match.group(1))


def _probe(video: Path) -> dict[str, float]:
    result = _run(
        [
            _tool("ffprobe"),
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-count_frames",
            "-show_entries",
            "stream=width,height,r_frame_rate,nb_read_frames",
            "-of",
            "json",
            str(video),
        ]
    )
    stream = json.loads(result.stdout)["streams"][0]
    num, den = stream["r_frame_rate"].split("/")
    return {
        "width": float(stream["width"]),
        "height": float(stream["height"]),
        "fps": float(num) / float(den),
        "frames": float(stream["nb_read_frames"]),
    }


def _timed(name: str, fn) -> Step:  # type: ignore[no-untyped-def]
    start = time.perf_counter()
    try:
        ok, detail = fn()
    except VerifyError as exc:
        ok, detail = False, str(exc)
    return Step(name=name, ok=ok, detail=detail, seconds=round(time.perf_counter() - start, 1))


def run_verify(update: bool = False, browser: str | None = None) -> list[Step]:
    """Render, then compare with tests/golden. With update=True, rewrite the references."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    steps: list[Step] = []

    def render_stills() -> tuple[bool, str]:
        for comp, frames in STILLS.items():
            for f in frames:
                _remotion(
                    ["still", "src/index.ts", comp, str(OUT_DIR / _still(comp, f)), f"--frame={f}"], browser
                )
        return True, f"{sum(len(v) for v in STILLS.values())} frames from {len(STILLS)} compositions"

    def render_video() -> tuple[bool, str]:
        _remotion(
            ["render", "src/index.ts", COMPOSITION, str(OUT_DIR / "verify.mp4"), "--codec=h264"], browser
        )
        return True, "verify.mp4"

    steps.append(_timed("Render stills", render_stills))
    steps.append(_timed("Render video", render_video))
    if not all(s.ok for s in steps):
        return steps

    def check_video() -> tuple[bool, str]:
        got = _probe(OUT_DIR / "verify.mp4")
        bad = [f"{k} {got[k]:g}≠{v:g}" for k, v in EXPECTED.items() if abs(got[k] - v) > 0.01]
        return (not bad), ", ".join(bad) or "1080×1920, 30 fps, 90 frames"

    steps.append(_timed("Video format", check_video))

    if update:

        def write_golden() -> tuple[bool, str]:
            GOLDEN_DIR.mkdir(parents=True, exist_ok=True)
            for comp, frames in STILLS.items():
                for f in frames:
                    shutil.copyfile(OUT_DIR / _still(comp, f), GOLDEN_DIR / _still(comp, f))
            where = "Docker" if in_container() else "native (not canonical)"
            return True, f"references rewritten from {where} render"

        steps.append(_timed("Update references", write_golden))
        return steps

    def compare() -> tuple[bool, str]:
        scores = []
        for comp, frames in STILLS.items():
            for f in frames:
                ref = GOLDEN_DIR / _still(comp, f)
                if not ref.exists():
                    return False, f"missing {ref.name}; run 'stagorix verify --update' in Docker"
                scores.append(_ssim(OUT_DIR / ref.name, ref))
        worst = min(scores)
        note = "" if in_container() else " (native run; references come from Docker)"
        return worst >= MIN_SSIM, f"min SSIM {worst:.4f} (need ≥ {MIN_SSIM}){note}"

    steps.append(_timed("Compare with golden", compare))
    steps.append(_timed("Transcribe sample", check_transcript))
    steps.append(_timed("Vertical framing", check_framing))
    steps.append(_timed("Person cutout", check_cutout))
    steps.append(_timed("Voice clean-up", check_voice))
    return steps


def check_cutout() -> tuple[bool, str]:
    """Run segmentation on the vertical clip from the framing step: RGBA frames must come out."""
    import cv2

    from stagorix.analysis.cutout import cut_out

    vertical = OUT_DIR / "vertical.mp4"
    if not vertical.exists():
        return False, "vertical.mp4 missing (framing step failed)"
    result = cut_out(vertical, OUT_DIR / "cutout", seconds=0.5)
    first = cv2.imread(str(OUT_DIR / "cutout" / "0000.png"), cv2.IMREAD_UNCHANGED)
    ok = result.frames == 15 and first is not None and first.shape == (1920, 1080, 4)
    return ok, f"{result.frames} RGBA frames · {result.model}"


def check_voice() -> tuple[bool, str]:
    """Clean the speech sample: loudness must land within 1 LU of the target."""
    from stagorix.analysis.voice import clean_voice

    voice = clean_voice(GOLDEN_DIR / SPEECH_FIXTURE, OUT_DIR / "voice.wav")
    ok = abs(voice.lufs_after - voice.target_lufs) <= 1.0
    return ok, f"{voice.lufs_before} → {voice.lufs_after} LUFS (target {voice.target_lufs})"


def check_framing() -> tuple[bool, str]:
    """Face tracking + 9:16 cut on a generated 16:9 clip with no face: crop must stay centred."""
    from stagorix.analysis.framing import render_vertical, track_faces
    from stagorix.analysis.video import probe

    src = OUT_DIR / "landscape.mp4"
    _run(
        [_tool("ffmpeg"), "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=1920x1080:r=30:d=2"]
        + ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", str(src)]
    )
    track = track_faces(src)
    centred = all(abs(x - (1920 - track.crop_width) / 2) < 0.01 for x in track.crop_x)
    out = render_vertical(src, track, OUT_DIR / "vertical.mp4")
    got = probe(out)
    ok = centred and (got.width, got.height, got.frames) == (1080, 1920, 60)
    return ok, f"{got.width}×{got.height}, {got.frames} frames, crop {'centred' if centred else 'moved'}"


def _norm(text: str) -> list[str]:
    return re.findall(r"[a-z']+", text.lower())


def check_transcript() -> tuple[bool, str]:
    """Transcribe a fixed English sample and compare the words with the known text."""
    from stagorix.analysis.media import MediaError
    from stagorix.analysis.transcribe import transcribe

    try:
        got = transcribe(GOLDEN_DIR / SPEECH_FIXTURE, language="en")
    except MediaError as exc:
        raise VerifyError(str(exc)) from exc
    expected = _norm(SPEECH_TEXT)
    heard = set(_norm(got.text))
    match = sum(w in heard for w in expected) / len(expected)
    return match >= MIN_WORD_MATCH, f"{match:.0%} of words (need ≥ {MIN_WORD_MATCH:.0%}) · {got.model}"
