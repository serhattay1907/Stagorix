"""The sound library: catalog, license log, build step and sound cues for an edit plan.

The catalog (render/src/sound/sounds.json) is the single source of truth, read by the
renderer too. It records every sound's pack, and every pack's author, license and source
(principle 6); downloaded files are checked against their sha256. Sound files are built
into render/public/sounds/ (gitignored, never committed): synthesized ones from code,
CC0 ones downloaded once into a cache. Every sound is loudness-matched on the way in, so
category gains alone set the mix.
"""

from __future__ import annotations

import hashlib
import os
import urllib.request
import wave
from pathlib import Path
from typing import Literal

import numpy as np
from pydantic import BaseModel, Field

from stagorix.assets import synth
from stagorix.render.motion import BEAT, CATALOG, EditPlan, Intensity

ROOT = Path(__file__).resolve().parents[2]
CATALOG_FILE = ROOT / "render" / "src" / "sound" / "sounds.json"
OUT_DIR = ROOT / "render" / "public" / "sounds"
SYNTH_PACK = "stagorix"

LOUD_WINDOW = 0.05  # seconds
LOUD_TARGET = -14.0  # dBFS RMS of the loudest window
PEAK_CEILING = -1.0  # dBFS


class Pack(BaseModel):
    name: str
    author: str
    license: str
    source: str
    download: str | None = Field(default=None, description="Base URL of the files, pinned to a commit")
    recipe: str | None = None


class Category(BaseModel):
    name: str
    gain: float = Field(ge=0, le=1, description="Mix level relative to the voice")


class Sound(BaseModel):
    id: str
    category: str
    pack: str
    seconds: float = Field(gt=0)
    peak: float = Field(ge=0, description="Seconds into the file that line up with the effect")
    file: str | None = None
    sha256: str | None = None


class EffectSound(BaseModel):
    sound: str
    hit: float | Literal["middle"] = Field(description="When the effect lands: seconds after its start")


class SoundCatalog(BaseModel):
    packs: dict[str, Pack]
    categories: dict[str, Category]
    effects: dict[str, EffectSound | None]
    sounds: list[Sound]

    def by_id(self) -> dict[str, Sound]:
        return {s.id: s for s in self.sounds}


def load_catalog(path: Path = CATALOG_FILE) -> SoundCatalog:
    return SoundCatalog.model_validate_json(path.read_text(encoding="utf-8"))


def cache_dir() -> Path:
    env = os.environ.get("STAGORIX_SOUNDS_CACHE")
    return Path(env) if env else Path.home() / ".cache" / "stagorix" / "sounds"


# --- audio helpers -------------------------------------------------------------------------


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    """16-bit PCM WAV as float frames x channels."""
    with wave.open(str(path), "rb") as w:
        if w.getsampwidth() != 2:
            raise ValueError(f"{path.name}: only 16-bit WAV is supported")
        ch, rate = w.getnchannels(), w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float64) / 32768
    return data.reshape(-1, ch), rate


def write_wav(path: Path, frames: np.ndarray, rate: int) -> None:
    frames = frames.reshape(len(frames), -1)
    data = (np.clip(frames, -1.0, 1.0) * 32767).round().astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(frames.shape[1])
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(data.tobytes())


def loudest_window_db(frames: np.ndarray, rate: int) -> float:
    mono = frames.reshape(len(frames), -1).mean(axis=1)
    n = max(1, min(len(mono), int(LOUD_WINDOW * rate)))
    energy = np.convolve(mono**2, np.ones(n) / n, mode="valid")
    return float(10 * np.log10(max(energy.max(), 1e-12)))


def normalize(frames: np.ndarray, rate: int) -> np.ndarray:
    """Match loudness (RMS of the loudest 50 ms) and keep peaks under -1 dBFS."""
    gain = 10 ** ((LOUD_TARGET - loudest_window_db(frames, rate)) / 20)
    peak = np.abs(frames).max() * gain
    ceiling = 10 ** (PEAK_CEILING / 20)
    if peak > ceiling:
        gain *= ceiling / peak
    return frames * gain


# --- build ---------------------------------------------------------------------------------


class BuildReport(BaseModel):
    built: int = 0
    downloaded: int = 0
    skipped: list[str] = Field(default_factory=list, description="Sounds left out, with the reason")


def _fetch(pack_id: str, pack: Pack, sound: Sound) -> Path:
    """Download a pack file once into the cache and check its sha256."""
    assert pack.download and sound.file and sound.sha256
    target = cache_dir() / pack_id / sound.file
    if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest() != sound.sha256:
        target.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(pack.download + sound.file, timeout=30) as r:  # noqa: S310 (pinned https URL)
            data = r.read()
        digest = hashlib.sha256(data).hexdigest()
        if digest != sound.sha256:
            raise ValueError(
                f"{sound.file}: checksum mismatch (expected {sound.sha256[:12]}…, got {digest[:12]}…)"
            )
        target.write_bytes(data)
    return target


def build(
    out_dir: Path = OUT_DIR, synth_only: bool = False, catalog: SoundCatalog | None = None
) -> BuildReport:
    """Write every sound as <id>.wav plus CREDITS.md. Failures are reported, never hidden."""
    catalog = catalog or load_catalog()
    out_dir.mkdir(parents=True, exist_ok=True)
    report = BuildReport()
    for s in catalog.sounds:
        try:
            if s.pack == SYNTH_PACK:
                frames, rate = synth.render(s.id), synth.RATE
            elif synth_only:
                report.skipped.append(f"{s.id}: --synth-only")
                continue
            else:
                frames, rate = read_wav(_fetch(s.pack, catalog.packs[s.pack], s))
                report.downloaded += 1
            write_wav(out_dir / f"{s.id}.wav", normalize(frames, rate), rate)
            report.built += 1
        except Exception as exc:  # noqa: BLE001 (collected and shown to the user)
            report.skipped.append(f"{s.id}: {exc}")
    (out_dir / "CREDITS.md").write_text(credits(catalog), encoding="utf-8")
    return report


def credits(catalog: SoundCatalog) -> str:
    counts: dict[str, int] = {}
    for s in catalog.sounds:
        counts[s.pack] = counts.get(s.pack, 0) + 1
    lines = ["# Sound credits", ""]
    for pid, p in catalog.packs.items():
        lines.append(
            f"- **{p.name}** ({counts.get(pid, 0)} sounds) by {p.author}, license {p.license}, {p.source}"
        )
    return "\n".join(lines) + "\n"


def is_built(out_dir: Path = OUT_DIR) -> bool:
    return (out_dir / "CREDITS.md").exists()


# --- sound cues for an edit plan -----------------------------------------------------------


class SoundCue(BaseModel):
    sound: str
    at: float = Field(description="Seconds where the file starts playing")
    effect: str


_RANK = {Intensity.STRONG: 3, Intensity.MEDIUM: 2, Intensity.SUBTLE: 1}


def plan_cues(plan: EditPlan, catalog: SoundCatalog | None = None) -> list[SoundCue]:
    """One sound per beat: the strongest effect in each beat gets its sound, aligned on its hit."""
    catalog = catalog or load_catalog()
    sounds = catalog.by_id()
    cues: list[SoundCue] = []
    beats: list[list] = []
    for e in sorted(plan.effects, key=lambda e: e.at):
        if beats and e.at - beats[-1][0].at <= BEAT:
            beats[-1].append(e)
        else:
            beats.append([e])
    for beat in beats:
        voiced = [e for e in beat if catalog.effects.get(e.effect) and e.effect in CATALOG]
        if not voiced:
            continue
        e = max(voiced, key=lambda e: _RANK[CATALOG[e.effect].intensity])
        mapping = catalog.effects[e.effect]
        assert mapping is not None
        hit = e.seconds / 2 if mapping.hit == "middle" else mapping.hit
        start = e.at + hit - sounds[mapping.sound].peak
        cues.append(SoundCue(sound=mapping.sound, at=round(max(start, 0.0), 3), effect=e.effect))
    return cues
