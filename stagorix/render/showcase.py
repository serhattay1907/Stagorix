"""Render the effect showcase (every effect with sample content) to a video.

With `footage`, the showcase plays over your own analysed clip (the 9:16 cut and the
person cutout from `stagorix analyze`) instead of the stand-in speaker. The clip is
copied into render/public/showcase-input/, which is gitignored: it never leaves your
machine (principle 4).
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from stagorix.verify import RENDER_DIR, VerifyError, _remotion

INPUT_DIR = RENDER_DIR / "public" / "showcase-input"
PLAN_FILE = RENDER_DIR.parent / "examples" / "plans" / "showcase.json"


def ensure_sounds() -> None:
    """Build the sound files on first use (in Docker they are built into the image)."""
    from stagorix.assets.sounds import build, is_built

    if not is_built():
        report = build()
        if report.skipped:
            raise VerifyError("some sounds could not be built:\n" + "\n".join(report.skipped))


def showcase_cues() -> list[dict[str, object]]:
    """Sound cues for the showcase, from its edit plan: the same path a real edit takes."""
    from stagorix.assets.sounds import plan_cues
    from stagorix.render.motion import EditPlan

    plan = EditPlan.model_validate_json(PLAN_FILE.read_text(encoding="utf-8"))
    return [{"sound": c.sound, "at": c.at} for c in plan_cues(plan)]


def stage_footage(analysis_dir: Path) -> dict[str, object]:
    """Copy vertical.mp4 and cutout/ from an analysis folder; return the matching props."""
    vertical = analysis_dir / "vertical.mp4"
    if not vertical.exists():
        raise FileNotFoundError(f"{vertical} not found; run `stagorix analyze <video>` first")
    if INPUT_DIR.exists():
        shutil.rmtree(INPUT_DIR)
    INPUT_DIR.mkdir(parents=True)
    shutil.copyfile(vertical, INPUT_DIR / "vertical.mp4")
    frames = 0
    cutout = analysis_dir / "cutout"
    if cutout.is_dir():
        shutil.copytree(cutout, INPUT_DIR / "cutout")
        frames = len(list((INPUT_DIR / "cutout").glob("*.png")))
    # Speaker effects need a person matte; a draft matte of the whole clip takes seconds.
    from stagorix.analysis.matte import Quality, write_mattes

    matte = write_mattes(INPUT_DIR / "vertical.mp4", INPUT_DIR / "matte", Quality.DRAFT)
    return {
        "footage": "showcase-input/vertical.mp4",
        "cutoutFrames": frames,
        "cutoutDir": "showcase-input/cutout",
        "matteDir": "showcase-input/matte",
        "matteFrames": matte.written,
        "matteFps": matte.fps,
    }


def render_showcase(
    out: Path,
    theme: Path | None = None,
    browser: str | None = None,
    footage: Path | None = None,
    look: str | None = None,
    composition: str = "Showcase",
    props: dict[str, object] | None = None,
) -> Path:
    """Render the Showcase (or another) composition; `theme` is a JSON file like {"theme": {...}}."""
    out = out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    props = dict(props or {})
    if composition in ("Showcase", "SoundReel"):
        ensure_sounds()
    if composition == "Showcase":
        props["sounds"] = showcase_cues()
    if theme is not None:
        props.update(json.loads(theme.read_text(encoding="utf-8")))
    if footage is not None:
        props.update(stage_footage(footage))
    if look:
        props["look"] = look
    args = ["render", "src/index.ts", composition, str(out), "--codec=h264"]
    if props:
        props_file = out.with_suffix(".props.json")
        props_file.write_text(json.dumps(props), encoding="utf-8")
        args.append(f"--props={props_file}")
    _remotion(args, browser)
    return out
