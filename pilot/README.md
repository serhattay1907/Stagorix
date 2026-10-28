# Pilot (Phase 1) — throwaway prototypes

These two prototypes were built on 27 Oct 2026 to validate the pipeline before any automation. They are **not** part of the Stagorix core and intentionally break principle 1 (the pilot brand is hard-coded). Phase 3 refactors what worked here into the brand-agnostic effect library.

| Folder | What it does | Output |
| --- | --- | --- |
| `news-short/` | Silent news Short built from a hand-written scene list (5 scenes, word-timed captions, 5 effects) | 40 s, 1080×1920 |
| `raw-edit/` | Edits a raw 16:9 talking-head video into a branded vertical Short | 25.6 s, 1080×1920, −15 LUFS |

## raw-edit pipeline

```
raw.mp4
  → transcribe.py   faster-whisper (medium, int8) → public/words.json
  → preprocess.py   OpenCV face tracking → 9:16 crop (public/vertical.mp4)
                    rembg person cutout for the hook (public/cutout/) → title behind the speaker
                    ffmpeg voice clean-up + loudnorm (public/voice.wav)
  → sfx.py          synthesised SFX + music bed (public/sfx/)
  → src/plan.ts     hand-written edit plan (EDL) locked to word timings
  → remotion render → ffmpeg loudnorm -14 LUFS
```

```bash
cd pilot/raw-edit
pip install -r requirements.txt
python transcribe.py /path/to/raw.mp4 tr
python preprocess.py /path/to/raw.mp4
python sfx.py
npm install && npm run render
ffmpeg -i out/edit_raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/final.mp4
```

`plan.ts` timings belong to the original test video; a different video needs a new plan (the future Editor agent's job).

## Findings

**Worked:** word-level Whisper captions, face-tracked vertical crop, text behind the speaker (person cutout), spring-based motion, glass checklist card, whip transition, loudness normalisation.

**Needs work:** synthesised SFX sound cheap → licensed library; music bed is weak → curated options; visual variety is low → B-roll, layouts, more effects; CPU is slow (cutout 1.6 s/frame, render 4.5 min) → GPU worker; loading every frame into RAM exceeded 7 GB → stream frames.

**Gotchas:** OpenCV 5.x moved `CascadeClassifier` (pin `<5`); PyAV mismatch in faster-whisper → decode audio with ffmpeg; Hugging Face model downloads need `huggingface.co`, `*.hf.co`, `*.xethub.hf.co` reachable.

Media (raw video, cutouts, renders) is not committed.
