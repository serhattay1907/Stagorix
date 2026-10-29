"""Apply approved flubs to a video and write a preview.

Only approved `shorten` and `cut` flubs change the timeline; `review` flubs
(stretched words) are listed but never edited automatically. Each kept piece
gets a 10 ms audio fade so joins do not click.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from pydantic import BaseModel, Field

from stagorix.analysis.media import MediaError, _ffmpeg
from stagorix.analysis.models import FlubAction, FlubReport
from stagorix.analysis.video import probe

FADE = 0.01
MIN_PIECE = 0.05  # pieces shorter than this are dropped


class CutPlan(BaseModel):
    duration: float
    keep: list[tuple[float, float]] = Field(description="Kept (start, end) pieces in seconds.")
    removed: float = Field(description="Seconds removed.")
    edits: int = Field(description="Approved flubs applied.")


def removals(report: FlubReport) -> list[tuple[float, float]]:
    """Spans to remove for approved flubs; a shortened gap keeps `keep` seconds split around its middle."""
    spans = []
    for f in report.flubs:
        if not f.approved:
            continue
        if f.action is FlubAction.CUT:
            spans.append((f.start, f.end))
        elif f.action is FlubAction.SHORTEN and f.end - f.start > f.keep:
            half = f.keep / 2
            spans.append((f.start + half, f.end - half))
    return spans


def plan_cuts(report: FlubReport, duration: float) -> CutPlan:
    spans = sorted((max(0.0, a), min(duration, b)) for a, b in removals(report) if b > a)
    merged: list[tuple[float, float]] = []
    for a, b in spans:
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))
    keep, t = [], 0.0
    for a, b in merged:
        if a - t >= MIN_PIECE:
            keep.append((round(t, 3), round(a, 3)))
        t = b
    if duration - t >= MIN_PIECE:
        keep.append((round(t, 3), round(duration, 3)))
    kept = sum(b - a for a, b in keep)
    edits = sum(1 for f in report.flubs if f.approved and f.action is not FlubAction.REVIEW)
    return CutPlan(duration=round(duration, 3), keep=keep, removed=round(duration - kept, 2), edits=edits)


def _filter(keep: list[tuple[float, float]], audio: bool) -> str:
    parts, labels = [], []
    for i, (a, b) in enumerate(keep):
        parts.append(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}]")
        labels.append(f"[v{i}]")
        if audio:
            out = max(b - a - FADE, 0)
            parts.append(
                f"[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,"
                f"afade=t=in:d={FADE},afade=t=out:st={out:.3f}:d={FADE}[a{i}]"
            )
            labels.append(f"[a{i}]")
    tail = f"concat=n={len(keep)}:v=1:a={1 if audio else 0}[v]" + ("[a]" if audio else "")
    return ";".join(parts) + ";" + "".join(labels) + tail


def render_preview(source: Path, report: FlubReport, out: Path) -> CutPlan:
    info = probe(source)
    plan = plan_cuts(report, info.frames / info.fps if info.fps else 0.0)
    if not plan.keep:
        raise MediaError("nothing left to keep after the approved cuts")
    cmd = [
        _ffmpeg(),
        "-v",
        "error",
        "-y",
        "-i",
        str(source),
        "-filter_complex",
        _filter(plan.keep, info.has_audio),
    ]
    cmd += ["-map", "[v]"] + (["-map", "[a]", "-c:a", "aac", "-b:a", "192k"] if info.has_audio else [])
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", str(out)]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise MediaError(f"ffmpeg could not write the preview: {result.stderr.strip()[-500:]}")
    return plan
