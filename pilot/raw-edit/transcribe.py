"""Word-level transcript with faster-whisper -> public/words.json.

Usage: python transcribe.py raw.mp4 [language]
"""
import json
import os
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

W = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(W, "raw.mp4")
lang = sys.argv[2] if len(sys.argv) > 2 else "tr"

# Decode with ffmpeg (avoids PyAV version issues): 16 kHz mono PCM
pcm = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
    check=True,
    capture_output=True,
).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768

model = WhisperModel("medium", device="cpu", compute_type="int8")
segments, _ = model.transcribe(audio, language=lang, word_timestamps=True, beam_size=5)

words = []
for s in segments:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}")
    words += [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for w in s.words]

os.makedirs(os.path.join(W, "public"), exist_ok=True)
json.dump(words, open(os.path.join(W, "public", "words.json"), "w"), ensure_ascii=False)
print(len(words), "words")
