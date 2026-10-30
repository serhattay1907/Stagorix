# Decision log

Append-only. Newest first. Each entry names the principle(s) it serves (P1–P7, see `CLAUDE.md`). To reverse a decision, add a new entry that supersedes it.

| Date | Decision | Rationale | Principle |
| --- | --- | --- | --- |
| 2026-10-30 | Emoji from Noto Color Emoji (OFL, already in the image), not Twemoji or platform emoji | Detailed colour emoji that look the same on every OS; no attribution line in every video (Twemoji is CC-BY); Apple emoji may not be redistributed | P2, P6 |
| 2026-10-30 | Three more caption styles: bold (uppercase, heavy outline, active word in accent), reveal (words appear as spoken), marker (highlighter behind key and active words) | The most common high-retention caption looks in short-form video, so brands can match their audience | P1 |
| 2026-10-30 | New emphasis effects: emoji pop (subtle), number pop with locale-aware count-up (medium), camera shake (medium: 0.45 s and small, so it does not use the strong budget) | Underline words and key numbers the way short-form editors do; numbers formatted in the brand's language | P1, P3 |
| 2026-10-30 | Motion language: every effect has a role (hook, emphasis, transition, info, outro) and an intensity (subtle, medium, strong); brands set rules (hook within 1 s, ≥ 2.5 s between beats, ≥ 6 s before an effect repeats, 4 strong effects per minute after the hook, outro required, signature effects); plans are checked before rendering and each effect carries a reason | Basis: calm vs expressive motion tiers in design systems (IBM Carbon productive/expressive, Material standard/emphasized); short-video retention guidance on an early hook and regular, motivated pattern interrupts. Numbers are starting values to tune with real videos | P1, P3 |
| 2026-10-30 | Effects starting within 0.3 s share one beat; spacing is measured between beats | A whip with a light leak is one moment, not two | P3 |
| 2026-10-30 | The motion catalog lives in Python (`stagorix/render/motion.py`); a test fails if an effect component has no catalog entry | One source of truth for the Editor agent and the checker; no effect escapes the rules | P3 |
| 2026-10-30 | Every step names the expertise it needs; decisions cite current sources, data or measurements, and the basis is logged here | Professional quality and traceable reasons for every choice | — |
| 2026-10-29 | Effect roadmap follows a motion language first: every effect carries a role (hook, emphasis, transition, info, outro), an intensity and spacing rules that brands tune and the Editor agent obeys; then pack A (caption styles, emoji/number emphasis, shake, transitions) with four preset looks and a sound library moved forward from 7.3; then pack B (speaker effects, data cards) | Effects with a reason and brand-consistent rules, not random effects; sound matters as much as picture | P1, P3 |
| 2026-10-29 | Bundled fonts: Montserrat, Inter, Bebas Neue from Fontsource (OFL-1.1, pinned), Latin + Latin Extended; rendering waits until they load | Same letters on every OS; OFL allows bundling; no frame renders with a fallback font | P2, P6 |
| 2026-10-29 | Effects place text by named positions (top, upper, middle, lower) inside a platform safe area, not by pixel values | Brands and the editor pick a position; text never sits under platform buttons | P1, P3 |
| 2026-10-29 | Caption styles: highlight, karaoke, boxed, pop (one word), plain | Covers the common Shorts caption looks; each brand picks one, a video may override it | P1 |
| 2026-10-29 | `stagorix showcase` renders the showcase with one command | Docker paths differ between shells (Git Bash rewrites `/app/...`); one command works the same everywhere | P2 |
| 2026-10-29 | Effects read a theme made of fixed scales (palette, font pair, radius 0–4, energy 1–5, caption style); a neutral theme is the default until brand profiles exist (4.1) | Brands and the setup wizard pick values on a scale instead of writing CSS; style packs (4.3) become preset themes; no brand look in the core | P1 |
| 2026-10-29 | A `Showcase` composition plays every effect with sample content; it is the review tool now, part of the golden test, and the basis of the template picker later (4.3, 6.4) | One place to see and compare effects; visual regressions are caught in CI | P2, P3 |
| 2026-10-29 | Effect timing props are in seconds; content (text, keywords, locale) always comes from props | Language- and frame-rate-neutral effects | P1 |
| 2026-10-29 | Fillers Whisper does not transcribe will be caught by giving Whisper the language's filler words as a hint, set per brand profile (4.1); no audio-based filler detector for now | Whisper folds an untranscribed "um" into the next word's timing, so it is invisible to the timestamp detector; filler words are language-specific and must not live in the core | P1, P3 |
| 2026-10-29 | Flub approval in the terminal (`flubs --review`, Enter keeps the suggestion) until the control panel exists (6.3) | Approval must be possible now; the panel will reuse the same `flubs.json` | P3 |
| 2026-10-29 | `stagorix cut` writes a separate preview; the source video is never changed; 10 ms audio fades at every join | Edits stay reversible; joins must not click | P3 |
| 2026-10-29 | Flub detector works on word timestamps only and measures speaking rate in seconds per letter (supersedes the prototype's Turkish vowel count) | Fast, no extra model, and language-neutral; Unicode punctuation marks sentence ends | P1, P2 |
| 2026-10-29 | Every flub is a proposal with a confidence score; only those ≥ 60% are pre-approved, and nothing is cut without the user's approval | Emphasis can look like a flub (a stretched short word); the user decides | P3 |
| 2026-10-29 | Pauses after a sentence are shortened to 0.6 s, gaps over 0.5 s after a comma to 0.3 s, gaps over 0.5 s inside a sentence to 0.2 s; never removed entirely. Stretch threshold 2.5×; tuned on one clean and one flawed recording | Removing every pause makes speech sound rushed and robotic | P3 |
| 2026-10-29 | A repeated phrase is cut only when the first take is an unfinished sentence; the last take is kept | Deliberate repetition (anaphora) across finished sentences must stay | P3 |
| 2026-10-29 | Stretched words are flagged for review, not edited automatically | Speeding up a single word belongs to rendering (3.6); a wrong guess is audible | P3 |
| 2026-10-29 | Virtual camera gets a dead zone (30% of the crop width) and sub-pixel crops; follow time 1 s (supersedes the 0.5 s always-follow camera) | A real talking-head test showed the camera chasing natural head sway (203 one-pixel moves in 51 s); with the dead zone the same clip needs zero moves | P2 |
| 2026-10-29 | Person cutout runs U²-Net (`u2net_human_seg`, Apache-2.0) directly with onnxruntime instead of the `rembg` package; model URL and SHA-256 pinned | Same model, far fewer dependencies (no numba, scikit-image, pymatting); download integrity checked | P2, P4, P6 |
| 2026-10-29 | Cutout covers only the opening seconds (default 3 s, `--cutout-seconds`) | Slowest step on CPU (~0.5 s/frame); titles-behind-speaker is a hook effect | P2, P5 |
| 2026-10-29 | Voice clean-up: high-pass 80 Hz, light compression, normalised to −16 LUFS; final mix goes to −14 LUFS in 3.6 | Clean, consistent voice before editing; platform loudness is set once at the end | P2 |
| 2026-10-29 | Video is streamed through ffmpeg pipes, one frame in memory at a time | The pilot loaded all frames and passed 7 GB of RAM | P2 |
| 2026-10-29 | Virtual camera: YuNet on 640 px frames every 0.1 s, gaps interpolated, two-way smoothing with a 0.5 s time constant; no face → centred crop and a visible warning | Smooth, frame-rate-independent motion; failure is shown, not hidden | P2, P3 |
| 2026-10-29 | OpenCV 5 (`opencv-python-headless`), YuNet model from `opencv/face_detection_yunet` (MIT), baked into the image | Current API; tiny model, works offline | P2, P6 |
| 2026-10-29 | The owner opens every pull request from a branch Claude pushed; Claude supplies the title and description (supersedes "Claude opens PRs") | PRs opened through Claude's tooling get an attribution footer that cannot be removed from there | — |
| 2026-10-29 | Whisper: `small` baked into the image; `medium` and `large-v3` downloaded on first use, announced with size and license | Keeps the image lean and the first run offline; larger models stay one flag away | P2, P3, P5 |
| 2026-10-29 | Transcription language comes from the caller or is detected; never hard-coded (the pilot hard-coded Turkish) | Core is language-neutral | P1 |
| 2026-10-29 | Every model is listed in `stagorix/models.py` with source repo and license; `stagorix models list` shows them | Licensing and visibility | P3, P6 |
| 2026-10-29 | Golden test also transcribes a synthetic English sample and requires ≥ 90% of the known words | Catches broken Whisper builds on each architecture | P2 |
| 2026-10-29 | Face detector: OpenCV YuNet; person cutout: rembg `u2net_human_seg` (both for 3.1) | YuNet handles side and tilted faces far better than Haar; u2net_human_seg kept for edge quality | P2 |
| 2026-10-29 | Golden test also runs on a Linux arm64 runner | Apple Silicon Docker runs linux/arm64; catches most macOS-specific breakage automatically until a real Mac test (12.0) | P2 |
| 2026-10-29 | macOS install test deferred; it must pass before the public release (12.0 gate) | No Mac available now; Windows and Linux already verified, macOS covered natively by CI | P2 |
| 2026-10-29 | Remotion's official agent skills are installed locally with one documented command, not copied into the repo (supersedes 2026-10-28 "ship with the repo") | The skills have no stated license; Remotion itself is not MIT; no agent-specific folders in the repo | P6, P7 |
| 2026-10-29 | Our own project skills live in `.agents/skills/<name>/` | Agent-neutral location | P7 |
| 2026-10-29 | README states Remotion's license (free up to 3 employees, company license above) | Users of an MIT project must not be surprised by a dependency's terms | P6 |
| 2026-10-29 | `stagorix verify` replaces `make verify` | `make` is not available on Windows by default | P2 |
| 2026-10-29 | Golden test compares rendered stills with references by SSIM ≥ 0.99, plus video format checks; references come only from the Docker image | Byte-identical video across encoders is unrealistic; SSIM catches real visual drift; Docker is the one canonical environment | P2 |
| 2026-10-29 | CI: lint, tests and typecheck natively on Ubuntu, macOS and Windows; golden test in Docker on Ubuntu | Hosted macOS/Windows runners cannot run Linux containers; Docker on those OSes is checked by hand in 2.8 | P2 |
| 2026-10-29 | One Dockerfile with a swappable base: Debian slim for CPU, NVIDIA CUDA (cuDNN) for GPU; GPU is a compose override file | CPU works everywhere with one command; GPU stays opt-in; macOS Docker has no GPU passthrough | P2, P5 |
| 2026-10-29 | Fonts in the image: Noto core + Noto Color Emoji; CJK fonts deferred | Covers Latin, Greek, Cyrillic and emoji without ~100 MB of CJK fonts; brand fonts come from brand profiles | P1, P2 |
| 2026-10-29 | ML models baked into the image in 3.1, together with the code that uses them | Baking models before their dependencies exist adds GBs with nothing to test | P2 |
| 2026-10-29 | Python tooling: uv + `uv.lock`, Typer CLI, Ruff, pytest; flat `stagorix/` package | One fast cross-OS tool for envs and locking; layout matches docs | P2 |
| 2026-10-29 | Render: Remotion 4.0.539 in `render/`, `zod` pinned to Remotion's own version (4.5.4) | Mismatched zod versions break prop schemas | P2 |
| 2026-10-29 | Unbuilt commands exit with code 2 and name their roadmap phase | Nothing fails silently | P3 |
| 2026-10-28 | No AI tool attribution in commits, PRs, docs or code; any credit only with owner approval | Owner preference; authorship stays with the owner | — |
| 2026-10-28 | Claude may branch, commit, push and open PRs freely; only the owner merges into `main`; no direct pushes to `main` | Keeps the real control point with the owner while removing per-commit friction | P3 |
| 2026-10-28 | `CLAUDE.md` in English; personal Turkish working notes in gitignored `CLAUDE.local.md` | Contributors' Claude Code reads `CLAUDE.md`; it must not be tied to one person | P1, language rule |
| 2026-10-28 | `docs/ROADMAP.md` is the source of truth for progress; the plan doc links to it | Two copies drift apart | P3 |
| 2026-10-28 | Name: **Stagorix** | "Shorts" belongs to YouTube and ties us to one platform; Stagora, Stagio, Theatron collided | P1 |
| 2026-10-28 | Three core principles fixed | Brand-agnostic, cross-OS, user control | P1–P3 |
| 2026-10-28 | Own control panel; Notion optional | Visibility must not depend on a third-party account | P3, P7 |
| 2026-10-28 | Instagram Reels in scope | Same engine plus a platform layer | P1 |
| 2026-10-28 | Mixed face/voice content; paid providers off by default | Owner preference | P5 |
| 2026-10-28 | If Claude Motion ships, add it next to Remotion, not instead | Remotion gives automation and portability | P2, P7 |
| 2026-10-28 | Yanny Studio not adopted; flub detection, style packs and style learning ideas taken | Mostly already planned; closed system | P7 |
| 2026-10-28 | Official Remotion Claude skills + 4 project skills in the repo | Portable, ship with the repo | P2 |
| 2026-10-27 | Architecture v2: text work in cloud (optional), media in local Docker worker | Pilot: CPU person cutout and render too slow for anything else | P2, P5 |
| 2026-10-27 | No separate editor; DaVinci export optional | Remotion is the editor; CapCut and DaVinci free are closed to automation | P2, P7 |
| 2026-10-27 | Three.js for 3D, no Blender | Same engine, no extra install | P2 |
| 2026-10-27 | YouTube upload only with approval | Nothing publishes without the user | P3 |
| 2026-10-24 | LangGraph orchestrator, Remotion renderer | Loops, routing and human-in-the-loop; typed, code-driven video | P3, P7 |
