from pathlib import Path

from stagorix.render.layouts import load_layouts

ROOT = Path(__file__).resolve().parents[1]
POSITIONS = {"top", "upper", "middle", "lower", "none"}


def test_every_layout_component_is_listed_and_valid() -> None:
    layouts = load_layouts()
    assert len({lay.id for lay in layouts}) == len(layouts) >= 10
    components = {p.stem for p in (ROOT / "render/src/layouts").glob("*.tsx")}
    assert components == {lay.component for lay in layouts}
    for lay in layouts:
        assert lay.captions in POSITIONS, lay.id
