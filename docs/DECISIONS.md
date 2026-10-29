# Decision log

Append-only. Newest first. Each entry names the principle(s) it serves (P1–P7, see `CLAUDE.md`). To reverse a decision, add a new entry that supersedes it.

| Date | Decision | Rationale | Principle |
| --- | --- | --- | --- |
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
