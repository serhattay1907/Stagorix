"""Render the effect showcase (every effect with sample content) to a video."""

from __future__ import annotations

from pathlib import Path

from stagorix.verify import _remotion


def render_showcase(out: Path, theme: Path | None = None, browser: str | None = None) -> Path:
    """Render the Showcase composition; `theme` is an optional JSON file with a theme object."""
    out = out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    args = ["render", "src/index.ts", "Showcase", str(out), "--codec=h264"]
    if theme is not None:
        props = theme.resolve()
        args.append(f"--props={props}")
    _remotion(args, browser)
    return out
