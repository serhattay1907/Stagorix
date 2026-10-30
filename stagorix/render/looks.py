"""Ready-made looks (style packs), read from the same JSON the renderer uses."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel

LOOKS_FILE = Path(__file__).resolve().parents[2] / "render" / "src" / "theme" / "looks.json"


class Look(BaseModel):
    id: str
    name: str
    description: str
    display_font: str
    body_font: str
    accent: str
    caption_style: str
    energy: int
    sound_volume: float


def load_looks() -> list[Look]:
    data = json.loads(LOOKS_FILE.read_text(encoding="utf-8"))
    return [
        Look(
            id=k,
            name=v["name"],
            description=v["description"],
            display_font=v["font"]["display"],
            body_font=v["font"]["body"],
            accent=v["palette"]["accent"],
            caption_style=v["captions"]["style"],
            energy=v["energy"],
            sound_volume=v["sound"]["volume"],
        )
        for k, v in data.items()
    ]
