"""Sound effects synthesized from code: whooshes, risers, impacts, pops, chimes, glitches.

Every sound is a short recipe (noise or sine, filter, envelope) with a fixed random seed,
so the same file comes out on every machine and nothing has to be downloaded or licensed
(principles 2 and 6). Designed sounds like these are how most short-form "whoosh" and
"hit" effects are made; realistic recordings come from the CC0 packs instead.
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np

RATE = 48_000
PEAK = 10 ** (-1 / 20)  # normalize to -1 dBFS

Signal = np.ndarray


def _t(seconds: float) -> Signal:
    return np.arange(int(seconds * RATE)) / RATE


def _noise(seconds: float, seed: int) -> Signal:
    return np.random.default_rng(seed).uniform(-1.0, 1.0, int(seconds * RATE))


def _sweep(t: Signal, f0: float, f1: float, curve: float = 1.0) -> Signal:
    """Frequency per sample moving from f0 to f1 on an exponential path."""
    k = (t / t[-1]) ** curve
    return f0 * (f1 / f0) ** k


def _osc(freq: Signal) -> Signal:
    return np.sin(2 * np.pi * np.cumsum(freq) / RATE)


def _bandpass(x: Signal, centre: Signal, q: float) -> Signal:
    """Chamberlin state-variable filter with a moving centre frequency."""
    out = np.empty_like(x)
    low = band = 0.0
    damp = 1.0 / q
    f = 2 * np.sin(np.pi * np.minimum(centre, RATE / 6) / RATE)
    for i, (s, fi) in enumerate(zip(x.tolist(), f.tolist(), strict=True)):
        high = s - low - damp * band
        band += fi * high
        low += fi * band
        out[i] = band
    return out


def _bell(t: Signal, peak: float, attack: float = 2.0, release: float = 3.0) -> Signal:
    """Rises to 1 at `peak` seconds, then falls; the shape of a passing object."""
    x = t / peak
    rise = x**attack
    fall = np.exp(-release * (t - peak) / max(t[-1] - peak, 1e-3))
    return np.where(t < peak, rise, fall)


def _decay(t: Signal, tau: float) -> Signal:
    return np.exp(-t / tau)


def _layer(a: Signal, b: Signal, offset: float) -> Signal:
    """Mix b into a, starting `offset` seconds later; the result is long enough for both."""
    start = int(offset * RATE)
    out = np.zeros(max(len(a), start + len(b)))
    out[: len(a)] += a
    out[start : start + len(b)] += b
    return out


def _finish(x: Signal) -> Signal:
    """Remove DC, fade in 2 ms and out up to 50 ms against clicks, normalize to -1 dBFS."""
    x = x - x.mean()
    n_in = min(int(0.002 * RATE), len(x) // 4)
    n_out = min(int(0.05 * RATE), len(x) // 5)
    x[:n_in] *= np.linspace(0.0, 1.0, n_in)
    x[-n_out:] *= np.cos(np.linspace(0.0, np.pi / 2, n_out)) ** 2
    return x * (PEAK / max(np.abs(x).max(), 1e-9))


# --- recipes -----------------------------------------------------------------------------


def whoosh(seconds: float, peak: float, f0: float, f1: float, q: float, seed: int) -> Signal:
    t = _t(seconds)
    centre = np.interp(t, [0, peak, seconds], [f0, f1, f0 * 0.7])
    return _bandpass(_noise(seconds, seed), centre, q) * _bell(t, peak)


def reverse_whoosh(seconds: float, f0: float, f1: float, q: float, seed: int) -> Signal:
    """Sucks in and stops on the cut: a whoosh played backwards."""
    return whoosh(seconds, seconds * 0.25, f0, f1, q, seed)[::-1].copy()


def riser(seconds: float, f0: float, f1: float, seed: int, air: float = 1.0, tone: float = 1.0) -> Signal:
    """Builds tension and stops on the beat: filtered noise and a rising tone, swelling."""
    t = _t(seconds)
    swell = (t / seconds) ** 2.2
    noise = _bandpass(_noise(seconds, seed), _sweep(t, f0 * 2, f1 * 4, 1.5), 3.0)
    pitch = _osc(_sweep(t, f0, f1, 1.6)) * 0.35 + _osc(_sweep(t, f0 * 1.5, f1 * 1.5, 1.6)) * 0.15
    return (noise * air + pitch * tone) * swell


def impact(seconds: float, f0: float, f1: float, tau: float, click: float, drive: float, seed: int) -> Signal:
    """A pitch-dropping sine body with a noise transient, saturated for punch.

    Phone speakers barely play below ~150 Hz, so the body carries 2nd and 3rd harmonics
    and the saturation adds more; the hit stays audible without a subwoofer.
    """
    t = _t(seconds)
    freq = f1 + (f0 - f1) * np.exp(-t / 0.06)
    body = (_osc(freq) + 0.6 * _osc(freq * 2) + 0.3 * _osc(freq * 3)) * _decay(t, tau)
    snap = _bandpass(_noise(seconds, seed) * _decay(t, 0.008), np.full_like(t, 3000.0), 1.2) * click * 2
    return np.tanh((body + snap) * drive) / np.tanh(drive)


def subdrop(seconds: float, f0: float, f1: float, drive: float = 2.5) -> Signal:
    """Falling sine; saturation adds odd harmonics so phones can play it."""
    t = _t(seconds)
    x = _osc(_sweep(t, f0, f1, 0.6)) * _decay(t, seconds / 2.5) * np.minimum(t / 0.01, 1)
    return np.tanh(x * drive) / np.tanh(drive)


def pop(seconds: float, f0: float, f1: float, tau: float) -> Signal:
    t = _t(seconds)
    freq = f1 + (f0 - f1) * np.exp(-t / 0.012)
    return _osc(freq) * _decay(t, tau)


def bell(seconds: float, notes: list[tuple[float, float]], ratios: list[float], tau: float) -> Signal:
    """Additive bell: each (start, frequency) note rings with inharmonic partials."""
    t = _t(seconds)
    out = np.zeros_like(t)
    for start, f in notes:
        k = np.clip(t - start, 0, None)
        on = t >= start
        for n, r in enumerate(ratios):
            out += on * np.sin(2 * np.pi * f * r * k) * np.exp(-k / (tau / (1 + n * 0.8))) / (1 + n)
    return out


def buzz(seconds: float, notes: list[tuple[float, float]]) -> Signal:
    """Soft square-ish tones for errors and 'wrong' moments."""
    t = _t(seconds)
    out = np.zeros_like(t)
    for start, f in notes:
        k = np.clip(t - start, 0, None)
        gate = np.clip((0.16 - k) / 0.02, 0, 1)  # 20 ms release, no click at the end
        out += (t >= start) * gate * np.tanh(3 * np.sin(2 * np.pi * f * k)) * np.exp(-k / 0.09)
    return _bandpass(out, np.full_like(t, 900.0), 0.8) + out * 0.2


def glitch(seconds: float, grain: float, crush: int, seed: int) -> Signal:
    """Stuttered grains of noise and tones, bit-crushed and sample-held."""
    rng = np.random.default_rng(seed)
    t = _t(seconds)
    out = np.zeros_like(t)
    pos = 0
    size = int(grain * RATE)
    while pos < len(t):
        n = int(size * rng.uniform(0.5, 1.5))
        if rng.random() < 0.8:
            seg = t[: min(n, len(t) - pos)]
            kind = rng.integers(3)
            if kind == 0:
                g = rng.uniform(-1, 1, len(seg))
            elif kind == 1:
                g = np.sign(np.sin(2 * np.pi * rng.uniform(80, 900) * seg))
            else:
                g = np.sin(2 * np.pi * rng.uniform(1200, 5000) * seg)
            out[pos : pos + len(seg)] = g * rng.uniform(0.4, 1.0)
        pos += n
    levels = 2 ** (crush - 1)
    out = np.round(out * levels) / levels
    hold = 6
    return np.repeat(out[::hold], hold)[: len(t)]


def ticks(seconds: float, count: int, freq: float, seed: int, land: float = 0.0) -> Signal:
    """Ticks slowing down like a counter rolling to a stop; optional landing pop."""
    rng = np.random.default_rng(seed)
    t = _t(seconds)
    out = np.zeros_like(t)
    roll = seconds - (0.25 if land else 0.0)
    for i in range(count):
        start = roll * (1 - (1 - i / count) ** 2)  # ease-out spacing
        k = np.clip(t - start, 0, None)
        out += (t >= start) * np.sin(2 * np.pi * freq * rng.uniform(0.95, 1.05) * k) * np.exp(-k / 0.004)
    if land:
        out = _layer(out, land * pop(0.2, 1100, 520, 0.05), roll)[: len(t)]
    return out


def shutter(seconds: float, seed: int) -> Signal:
    """Two filtered clicks, like a camera shutter."""
    t = _t(seconds)
    n = _noise(seconds, seed)
    first = _bandpass(n * _decay(t, 0.006), np.full_like(t, 3500.0), 1.5)
    second = _bandpass(n * _decay(t, 0.01), np.full_like(t, 2200.0), 1.5)
    return _layer(first, second * 0.8, 0.07)[: len(t)]


# --- the library --------------------------------------------------------------------------

# id -> (recipe, peak seconds = the moment that lines up with the effect)
Recipe = tuple[Callable[[], Signal], float]

C6, E6, G6, C7 = 1046.5, 1318.5, 1568.0, 2093.0
BELL = [1.0, 2.76, 5.4, 8.93]
SOFT_BELL = [1.0, 2.0, 3.0]

RECIPES: dict[str, Recipe] = {
    "whoosh-soft": (lambda: whoosh(0.7, 0.35, 400, 2200, 2.5, 1), 0.35),
    "whoosh-fast": (lambda: whoosh(0.45, 0.2, 600, 4200, 2.0, 2), 0.2),
    "whoosh-long": (lambda: whoosh(1.2, 0.6, 300, 1800, 3.0, 3), 0.6),
    "whoosh-airy": (lambda: whoosh(0.8, 0.4, 1500, 7000, 1.5, 4), 0.4),
    "whoosh-low": (lambda: whoosh(0.9, 0.45, 150, 900, 3.0, 5), 0.45),
    "whoosh-reverse": (lambda: reverse_whoosh(0.7, 400, 2600, 2.5, 6), 0.7 * 0.75),
    "swipe-up": (lambda: whoosh(0.22, 0.14, 1500, 6000, 1.8, 7), 0.14),
    "swipe-down": (lambda: whoosh(0.22, 0.08, 5000, 1200, 1.8, 8), 0.08),
    "swipe-short": (lambda: whoosh(0.14, 0.06, 2500, 7500, 1.5, 9), 0.06),
    "swipe-wide": (lambda: whoosh(0.3, 0.12, 800, 5000, 1.2, 10), 0.12),
    "riser-short": (lambda: riser(1.0, 180, 900, 11), 1.0),
    "riser-long": (lambda: riser(2.0, 120, 1200, 12), 2.0),
    "riser-bright": (lambda: riser(1.2, 300, 2400, 13), 1.2),
    "riser-micro": (lambda: riser(0.45, 400, 2000, 14), 0.45),
    "riser-noise": (lambda: riser(1.5, 200, 1500, 28, tone=0.0), 1.5),
    "riser-pitch": (lambda: riser(1.2, 220, 880, 29, air=0.15), 1.2),
    "impact-punch": (lambda: impact(0.5, 160, 48, 0.12, 0.6, 2.5, 15), 0.0),
    "impact-boom": (lambda: impact(1.8, 110, 32, 0.6, 0.5, 2.0, 16), 0.0),
    "impact-thump": (lambda: impact(0.3, 120, 55, 0.07, 0.2, 1.5, 17), 0.0),
    "impact-hit": (lambda: impact(0.45, 220, 70, 0.09, 1.0, 3.0, 18), 0.0),
    "impact-soft": (lambda: impact(0.4, 100, 50, 0.1, 0.1, 1.0, 19), 0.0),
    "drop-sub": (lambda: subdrop(1.4, 90, 28), 0.0),
    "drop-short": (lambda: subdrop(0.7, 120, 40), 0.0),
    "drop-long": (lambda: subdrop(2.2, 70, 24), 0.0),
    "drop-pitch": (lambda: subdrop(0.6, 420, 70), 0.0),
    "pop-bubble": (lambda: pop(0.12, 380, 950, 0.03), 0.0),
    "pop-mouth": (lambda: pop(0.1, 900, 250, 0.025), 0.0),
    "pop-high": (lambda: pop(0.1, 1400, 600, 0.02), 0.0),
    "pop-low": (lambda: pop(0.14, 500, 160, 0.035), 0.0),
    "pop-double": (lambda: _layer(pop(0.12, 900, 250, 0.025), pop(0.12, 1200, 400, 0.02), 0.055), 0.0),
    "chime-ding": (lambda: bell(1.2, [(0, E6)], BELL, 0.5), 0.0),
    "chime-high": (lambda: bell(1.0, [(0, C7)], BELL, 0.35), 0.0),
    "chime-success": (lambda: bell(1.3, [(0, C6), (0.11, G6)], BELL, 0.45), 0.0),
    "chime-triple": (lambda: bell(1.4, [(0, C6), (0.09, E6), (0.18, G6)], BELL, 0.4), 0.0),
    "chime-soft": (lambda: bell(1.0, [(0, G6 / 2)], SOFT_BELL, 0.4), 0.0),
    "notify-up": (lambda: bell(0.6, [(0, G6 / 2), (0.08, C6)], SOFT_BELL, 0.12), 0.0),
    "notify-blip": (lambda: bell(0.35, [(0, C7)], SOFT_BELL, 0.05), 0.0),
    "notify-two": (lambda: bell(0.6, [(0, E6), (0.12, E6)], SOFT_BELL, 0.08), 0.0),
    "error-buzz": (lambda: buzz(0.45, [(0, 220.0), (0.16, 175.0)]), 0.0),
    "error-low": (lambda: buzz(0.3, [(0, 140.0)]), 0.0),
    "error-triple": (lambda: buzz(0.55, [(0, 260.0), (0.13, 260.0), (0.26, 196.0)]), 0.0),
    "glitch-stutter": (lambda: glitch(0.4, 0.03, 4, 20), 0.2),
    "glitch-short": (lambda: glitch(0.2, 0.02, 5, 21), 0.1),
    "glitch-long": (lambda: glitch(0.8, 0.04, 3, 22), 0.4),
    "glitch-digital": (lambda: glitch(0.35, 0.015, 6, 23), 0.17),
    "tick-single": (lambda: ticks(0.06, 1, 3800, 24), 0.0),
    "tick-counter": (lambda: ticks(0.95, 14, 3600, 25, land=0.7), 0.0),
    "tick-clock": (lambda: ticks(0.7, 4, 2600, 26), 0.0),
    "shutter-camera": (lambda: shutter(0.25, 27), 0.0),
}


def render(sound_id: str) -> Signal:
    make, _ = RECIPES[sound_id]
    return _finish(make().astype(np.float64))


def peak_of(sound_id: str) -> float:
    return RECIPES[sound_id][1]


__all__ = ["RATE", "RECIPES", "peak_of", "render"]
