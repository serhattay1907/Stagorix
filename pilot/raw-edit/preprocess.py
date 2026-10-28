"""Preprocess: face tracking -> 9:16 vertical video, person cutout for the hook, last frame.

Usage: python preprocess.py raw.mp4
Requires opencv-python-headless<5 (5.x moved CascadeClassifier) and rembg[cpu].
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np

W = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(W, "raw.mp4")
PUB = os.path.join(W, "public")
os.makedirs(os.path.join(PUB, "cutout"), exist_ok=True)

cap = cv2.VideoCapture(SRC)
fps = cap.get(cv2.CAP_PROP_FPS)
sw, sh = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
frames = []
while True:
    ok, f = cap.read()
    if not ok:
        break
    frames.append(f)
n = len(frames)

# 1) Face tracking (every 3rd frame, at 640px width)
casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
xs, ys = np.full(n, np.nan), np.full(n, np.nan)
k = 640 / sw
for i in range(0, n, 3):
    g = cv2.cvtColor(cv2.resize(frames[i], None, fx=k, fy=k), cv2.COLOR_BGR2GRAY)
    faces = casc.detectMultiScale(g, 1.1, 5, minSize=(30, 30))
    if len(faces):
        x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
        xs[i], ys[i] = (x + w / 2) / k, (y + h / 2) / k
idx = np.arange(n)
ok = ~np.isnan(xs)
cx = np.interp(idx, idx[ok], xs[ok])
cy = np.interp(idx, idx[ok], ys[ok])


def ema(a, al=0.06):
    """Bidirectional EMA: the virtual camera follows slowly, without jitter."""
    o = a.copy()
    for i in range(1, len(o)):
        o[i] = o[i - 1] + al * (o[i] - o[i - 1])
    for i in range(len(o) - 2, -1, -1):
        o[i] = o[i + 1] + al * (o[i] - o[i + 1])
    return o


cx, cy = ema(cx), ema(cy)
print(f"faces found on {ok.sum()} sampled frames; cx range {cx.min():.0f}-{cx.max():.0f}, cy ~{cy.mean():.0f}")

# 2) 9:16 crop (full height), centred on the face
cw = int(round(sh * 9 / 16))
left = np.clip(cx - cw / 2, 0, sw - cw).astype(int)
OW, OH = 1080, 1920
enc = subprocess.Popen(
    ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}", "-r", str(fps), "-i", "-",
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", os.path.join(PUB, "vertical.mp4")],
    stdin=subprocess.PIPE,
)
HOOK = int(3.4 * fps)
vert = {}
for i in range(n):
    f = frames[i]
    crop = f[:, left[i] : left[i] + cw]
    v = cv2.resize(crop, (OW, OH), interpolation=cv2.INTER_LANCZOS4)
    if i < HOOK or i == n - 1:
        vert[i] = v
    enc.stdin.write(v.tobytes())
    frames[i] = None  # free memory as we stream (all frames at once exceeded 7 GB)
enc.stdin.close()
enc.wait()
cv2.imwrite(os.path.join(PUB, "lastframe.jpg"), vert[n - 1], [cv2.IMWRITE_JPEG_QUALITY, 95])
face_y_vertical = float(np.mean(cy) * OH / sh)

# 3) Person cutout for the hook (first ~3.4 s) -> title text goes behind the speaker
from rembg import new_session, remove
from PIL import Image

sess = new_session("u2net_human_seg")
for i in range(min(HOOK, n)):
    rgb = cv2.cvtColor(vert[i], cv2.COLOR_BGR2RGB)
    small = Image.fromarray(rgb).resize((540, 960))
    m = remove(small, session=sess, only_mask=True).resize((OW, OH), Image.BILINEAR)
    m = np.array(m).astype(np.float32)
    m = cv2.GaussianBlur(m, (0, 0), 1.5)
    rgba = np.dstack([rgb, np.clip(m, 0, 255).astype(np.uint8)])
    Image.fromarray(rgba).save(os.path.join(PUB, "cutout", f"{i:04d}.png"), compress_level=3)
    if i % 20 == 0:
        print("cutout", i, "/", HOOK, flush=True)

json.dump({"fps": fps, "frames": n, "hookFrames": min(HOOK, n), "faceY": face_y_vertical}, open(os.path.join(PUB, "meta.json"), "w"))
print("done", n, "frames, faceY", round(face_y_vertical))

# 4) Voice: high-pass, light compression, loudness normalisation
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-i", SRC, "-vn", "-ac", "2", "-ar", "48000", "-af",
     "highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=11",
     os.path.join(PUB, "voice.wav")],
    check=True,
)
