from stagorix.render.looks import load_looks

CAPTION_STYLES = {"highlight", "karaoke", "boxed", "pop", "bold", "reveal", "marker", "plain"}
FONTS = {"montserrat", "inter", "bebas", "oswald", "playfair", "spaceGrotesk", "poppins", "righteous", "noto"}


def test_ten_looks_with_known_fonts_and_styles() -> None:
    looks = load_looks()
    assert len(looks) >= 10
    assert len({lk.id for lk in looks}) == len(looks)
    for lk in looks:
        assert lk.display_font in FONTS and lk.body_font in FONTS, lk.id
        assert lk.caption_style in CAPTION_STYLES, lk.id
        assert 1 <= lk.energy <= 5
