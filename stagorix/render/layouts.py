"""Layouts (how the speaker and the content share the frame), read from the same JSON the renderer uses."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel

LAYOUTS_FILE = Path(__file__).resolve().parents[2] / "render" / "src" / "layouts" / "layouts.json"


class Layout(BaseModel):
    id: str
    name: str
    component: str
    description: str
    content: str
    captions: str


def load_layouts() -> list[Layout]:
    data = json.loads(LAYOUTS_FILE.read_text(encoding="utf-8"))
    return [Layout(id=k, **v) for k, v in data.items()]
