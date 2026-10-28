"""Royalty-free sound effects and a music bed, fully synthesised with numpy.

Pilot finding: these sound cheap next to recorded libraries; to be replaced by a
licensed library (Mixkit / Pixabay) in the asset layer.
"""
import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "sfx")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def env(n, a, r, shape=2.0):
    x = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    x[:na] = np.linspace(0, 1, na) ** shape if na else 1
    x[-nr:] *= np.linspace(1, 0, nr) ** shape
    return x


def norm(x, peak=0.9):
    return x / (np.abs(x).max() + 1e-9) * peak


def stereo(x, width=0.0):
    if width == 0:
        return np.stack([x, x], 1)
    d = int(width * SR)
    return np.stack([x, np.concatenate([np.zeros(d), x[:-d]])], 1)


def bandsweep(noise, f0, f1, q=2.0):
    """Sliding band-pass filter, processed block by block."""
    out = np.zeros_like(noise)
    blk = 512
    nb = len(noise) // blk + 1
    for b in range(nb):
        s = noise[b * blk : (b + 1) * blk]
        if not len(s):
            break
        fr = f0 * (f1 / f0) ** (b / max(nb - 1, 1))
        lo, hi = max(fr / q, 40), min(fr * q, SR / 2 - 100)
        sos = butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        out[b * blk : b * blk + len(s)] = sosfilt(sos, s)
    return out


def save(name, x):
    sf.write(os.path.join(OUT, name), x.astype(np.float32), SR)


# whoosh
d = 0.55
n = rng.standard_normal(int(SR * d))
save("whoosh.wav", stereo(norm(bandsweep(n, 300, 4000) * env(len(n), 0.35, 0.2, 1.5), 0.8), 0.004))

# whip
d = 0.28
n = rng.standard_normal(int(SR * d))
save("whip.wav", stereo(norm(bandsweep(n, 1200, 6000, 1.6) * env(len(n), 0.12, 0.14, 1.2), 0.85), 0.003))

# impact
d = 1.2
x = t(d)
body = np.sin(2 * np.pi * (55 * np.exp(-x * 1.5)) * x) * np.exp(-x * 3.2)
crack = sosfilt(butter(2, 2500, "low", fs=SR, output="sos"), rng.standard_normal(len(x))) * np.exp(-x * 25)
save("impact.wav", stereo(norm(body + crack * 0.5, 0.9)))

# pop
d = 0.16
x = t(d)
f = 1100 * np.exp(-x * 14) + 380
save("pop.wav", stereo(norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 30), 0.75)))

# tick
d = 0.03
x = t(d)
k = sosfilt(butter(2, [2000, 7000], "band", fs=SR, output="sos"), rng.standard_normal(len(x))) * np.exp(-x * 220)
save("tick.wav", stereo(norm(k, 0.5)))

# buzz
d = 0.34
x = t(d)
sq = np.sign(np.sin(2 * np.pi * 150 * x)) * 0.5 + np.sign(np.sin(2 * np.pi * 151.5 * x)) * 0.5
sq = sosfilt(butter(2, 1800, "low", fs=SR, output="sos"), sq)
gate = ((x % 0.17) < 0.13).astype(float)
save("buzz.wav", stereo(norm(sq * gate * env(len(x), 0.005, 0.05), 0.45)))

# riser
d = 1.6
x = t(d)
n = rng.standard_normal(len(x))
r = bandsweep(n, 400, 8000, 1.8) * (x / d) ** 2.2
tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (x / d) ** 2) / SR) * (x / d) ** 3 * 0.25
save("riser.wav", stereo(norm(r + tone, 0.7), 0.006))

# ding
d = 1.4
x = t(d)
dg = (np.sin(2 * np.pi * 1318.5 * x) + 0.5 * np.sin(2 * np.pi * 2637 * x) + 0.25 * np.sin(2 * np.pi * 3955 * x)) * np.exp(-x * 4)
save("ding.wav", stereo(norm(dg, 0.6)))

# music bed: soft pad (Am - F - C - G), 70 BPM, gentle pulse
bpm, bars = 70, 8
beat = 60 / bpm
dur = bars * 4 * beat
x = t(dur)
chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [130.81, 196.0, 261.63], [196.0, 246.94, 293.66]]
pad = np.zeros_like(x)
for i in range(bars):
    c = chords[i % 4]
    s, e = int(i * 4 * beat * SR), int((i + 1) * 4 * beat * SR)
    seg = x[: e - s]
    v = np.zeros(e - s)
    for fq in c:
        for det in (-0.12, 0.0, 0.12):
            v += np.sin(2 * np.pi * fq * (1 + det / 100) * seg + rng.uniform(0, 6.28))
            v += 0.3 * np.sin(2 * np.pi * fq * 2 * (1 + det / 100) * seg)
    v *= env(len(v), 0.6, 0.6, 1.2)
    pad[s:e] += v
pad = sosfilt(butter(2, 1400, "low", fs=SR, output="sos"), pad)
kick = np.zeros_like(x)
kx = t(0.35)
kk = np.sin(2 * np.pi * (48 + 80 * np.exp(-kx * 30)) * kx) * np.exp(-kx * 9)
for b in range(int(dur / beat)):
    s = int(b * beat * SR)
    kick[s : s + len(kk)] += kk[: len(kick) - s]
bed = norm(pad, 0.5) + norm(kick, 0.35)
bed *= env(len(bed), 1.5, 2.5, 1.0)
save("bed.wav", stereo(norm(bed, 0.8), 0.012))
print("sfx ok:", sorted(os.listdir(OUT)))
