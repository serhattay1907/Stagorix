import io
import json
from pathlib import Path

import numpy as np
import pytest

from stagorix.assets import sounds, synth
from stagorix.assets.sounds import build, load_catalog, loudest_window_db, normalize, plan_cues
from stagorix.render.motion import CATALOG, EditPlan

PLAN = Path(__file__).resolve().parents[1] / "examples" / "plans" / "showcase.json"


def test_catalog_is_consistent_and_licensed() -> None:
    cat = load_catalog()
    ids = [s.id for s in cat.sounds]
    assert len(ids) == len(set(ids))
    for s in cat.sounds:
        assert s.category in cat.categories, s.id
        assert s.pack in cat.packs, s.id
        pack = cat.packs[s.pack]
        assert pack.license and pack.author and pack.source
        if pack.download:
            assert s.file and s.sha256 and len(s.sha256) == 64, s.id
            assert pack.download.startswith("https://") and "/" in pack.download
    assert len(cat.categories) == 12


def test_synth_entries_match_the_recipes() -> None:
    cat = load_catalog()
    entries = {s.id: s for s in cat.sounds if s.pack == sounds.SYNTH_PACK}
    assert set(entries) == set(synth.RECIPES)
    for sid, s in entries.items():
        x = synth.render(sid)
        assert abs(len(x) / synth.RATE - s.seconds) < 0.002, sid
        assert s.peak == synth.peak_of(sid), sid


def test_every_effect_has_a_sound_decision() -> None:
    cat = load_catalog()
    known = cat.by_id()
    assert set(cat.effects) == set(CATALOG)
    for effect, mapping in cat.effects.items():
        if mapping:
            assert mapping.sound in known, effect


@pytest.mark.parametrize("sid", list(synth.RECIPES))
def test_synth_is_deterministic_clean_and_under_ceiling(sid: str) -> None:
    a, b = synth.render(sid), synth.render(sid)
    assert np.array_equal(a, b)
    assert np.isfinite(a).all()
    assert np.abs(a).max() <= 10 ** (-1 / 20) + 1e-9
    assert abs(a[-1]) < 1e-3 and abs(a[0]) < 1e-3  # no click at either end


def test_normalize_matches_loudness_and_keeps_peaks_down() -> None:
    t = np.arange(48_000) / 48_000
    quiet = 0.01 * np.sin(2 * np.pi * 440 * t)
    out = normalize(quiet, 48_000)
    assert abs(loudest_window_db(out, 48_000) - sounds.LOUD_TARGET) < 0.1
    spiky = np.zeros(48_000)
    spiky[100] = 0.5
    assert np.abs(normalize(spiky, 48_000)).max() <= 10 ** (sounds.PEAK_CEILING / 20) + 1e-9


def test_plan_cues_one_sound_per_beat_aligned_on_the_hit() -> None:
    plan = EditPlan.model_validate_json(PLAN.read_text(encoding="utf-8"))
    cues = plan_cues(plan)
    by_effect = {c.effect: c for c in cues}
    # whip (strong) and grade leak share a beat: only the whip sounds
    assert "grade.leak" not in by_effect
    whip = next(c for c in cues if c.effect == "camera.whip")
    assert whip.sound == "whoosh-fast" and whip.at == pytest.approx(2.85 + 0.35 / 2 - 0.2)
    # shake (medium) beats emoji pop (subtle) in the same beat
    assert "emoji.pop" not in by_effect and by_effect["camera.shake"].sound == "impact-hit"
    assert by_effect["outro.card"].sound == "chime-success"
    assert all(c.at >= 0 for c in cues)


def test_synth_only_build_writes_files_and_credits(tmp_path) -> None:
    report = build(out_dir=tmp_path, synth_only=True)
    assert report.built == len(synth.RECIPES)
    assert len(list(tmp_path.glob("*.wav"))) == len(synth.RECIPES)
    assert all("--synth-only" in line for line in report.skipped)
    assert "CC0-1.0" in (tmp_path / "CREDITS.md").read_text(encoding="utf-8")


def test_download_with_a_wrong_checksum_is_reported(tmp_path, monkeypatch) -> None:
    cat = load_catalog()
    one = next(s for s in cat.sounds if s.pack != sounds.SYNTH_PACK)
    small = cat.model_copy(update={"sounds": [one]})
    monkeypatch.setenv("STAGORIX_SOUNDS_CACHE", str(tmp_path / "cache"))
    monkeypatch.setattr(sounds.urllib.request, "urlopen", lambda *a, **k: io.BytesIO(b"not the file"))
    report = build(out_dir=tmp_path / "out", catalog=small)
    assert report.built == 0 and "checksum mismatch" in report.skipped[0]


def test_looks_and_theme_share_the_sound_volume_scale() -> None:
    looks = json.loads((sounds.ROOT / "render" / "src" / "theme" / "looks.json").read_text(encoding="utf-8"))
    assert all(0 <= lk["sound"]["volume"] <= 1 for lk in looks.values())
