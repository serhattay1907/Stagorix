# Roadmap

Source of truth for progress. 12 phases after Phase 0. Owner tags: **(S)** = Serhat, **(C)** = Claude.

| Phase | Name | Status |
| --- | --- | --- |
| 0 | Setup | ✅ |
| 1 | Pilot | ✅ |
| 2 | Cleanup and repo skeleton | ✅ (macOS test deferred, see 2.8) |
| 3 | Core engine | ⬜ |
| 4 | Brand system | ⬜ |
| 5 | Agents (LangGraph) | ⬜ |
| 6 | Control panel | ⬜ |
| 7 | Asset layer | ⬜ |
| 8 | Upload your own video | ⬜ |
| 9 | Publishing | ⬜ |
| 10 | Automation | ⬜ |
| 11 | First real week (Random Talks Academy) | ⬜ |
| 12 | Open source and CV | ⬜ |

## Milestones

| Milestone | What the user gets | Done when |
| --- | --- | --- |
| **MVP** | Own raw video → cut, captioned, effect-rich, branded vertical Short, with approval | Phase 3, the core of 4.1 and 8.1 |
| **v1** | Every option dimension at its v1 target, three-layer choice, option review gate passed | End of phase 8 (8.5) |
| **Pro** | Every option dimension at its Pro target, publishing and automation | End of phase 12 |

## Option targets

The user chooses from a rich, curated catalog; nothing is locked (filters are a default view with "show all", expert mode shows everything, every choice can be undone). Exact lists are researched and approved in the task that builds them.

| Dimension | v1 | Pro | Task |
| --- | --- | --- | --- |
| Content formats | 20 | 25+ | 5.8 |
| Hook types | 20 | 30+ | 5.8 |
| Looks (style packs) | 10 | 15+ | 4.3 |
| Font pairs (OFL) | 20 | 30+ | 4.6 |
| Caption styles | 15 | 20+ | 3.3 |
| Effects | 40 | 60+ | 3.3–3.5 |
| Layouts | 10 | 12+ | 3.4 |
| Sound effects (curated, licensed) | ~150 in 12 categories | 300+ | 3.3c-4, 7.3 |
| Music | 12 moods × 5 tracks | 20+ moods | 7.4 |
| Voice-over | Local free TTS, 2–4 voices per language | + paid voice cloning plugin (off, budget cap, own voice only) | 7.6 |
| Visual sources | Own files, stock B-roll, Lottie, import with license field | + AI generation plugins (off, budget cap) | 7.1–7.5, 7.7 |
| Duration | 15 / 30 / 45 / 60 / 90 s / 3 min | per platform rules | 8.4 |
| Tempo | 3 levels | 5 levels | 8.4 |
| Calls to action | 12 types | 20+ | 9.4 |

After the option review gate, requests stay open for good: each wish becomes a numbered request (E-01, E-02, …) delivered as one small PR.

## Phase 0 — Setup ✅

- [x] 0.1 GitHub repo (C)
- [x] 0.2 Docker installed and tested (C)
- [x] 0.3 Git, Node, Python, uv (S)
- [x] 0.4 Claude Code + token (S)
- [x] 0.5 Notion connection + token (C, token S)
- [x] 0.6 Drive `inbox` / `output` folders (C)
- [x] 0.7 Repo connected to the session (C)

## Phase 1 — Pilot ✅

- [x] 1.1 Silent news pilot (C)
- [x] 1.2 Raw video to effect-rich edit v1 (C)
- [x] 1.3 Review: flow is good; visual richness and audio quality need work (S)

## Phase 2 — Cleanup and repo skeleton

- [x] 2.1 Rename repo to `stagorix` (C)
- [x] 2.2 Separate "Stagorix" Claude project with principles in its instructions (S)
- [x] 2.3 `CLAUDE.md`, `README`, `docs/ARCHITECTURE`, `DECISIONS`, `ROADMAP` (C, push approval S)
- [x] 2.4 Folder structure, `pyproject.toml`, `package.json`, CLI skeleton (C)
- [x] 2.5 Docker `cpu` / `gpu` profiles, pinned versions, fonts and models in the image (C)
- [x] 2.6 Golden test (`stagorix verify`) + CI (C)
- [x] 2.7 Official Remotion skills: documented local install, not vendored (C)
- [ ] 2.8 Install test on macOS, Windows and Linux (S) — Windows ✅ (Docker, golden test SSIM 1.0), Linux ✅ (CI); **macOS open: required before 12.1**

## Phase 3 — Core engine

- [x] 3.1 Analysis: Whisper, face tracking, person cutout (ported from pilot) (C)
- [x] 3.2 Flub detector (C) — 3.2a detection + confidence list, 3.2b terminal approval + cut preview
- [ ] 3.3 Effect library v1: pilot effects as Zod-typed components (C)
  - [x] 3.3a Talking-head effects on a theme scale: captions (5 styles), title behind speaker + cutout layer, camera zooms and whips, label, outro, grade; bundled fonts; named positions in a safe area; `Showcase` composition and `stagorix showcase`
  - [x] 3.3b Motion language: effect roles, intensity and spacing rules, set per brand (`docs/MOTION.md`, `stagorix effects`, `stagorix check-plan`)
  - [ ] 3.3c Pack A
    - [x] 3.3c-1 Caption styles bold, reveal, marker; emoji pop; number pop; camera shake
    - [ ] 3.3c-2 Transitions: glitch, mask wipe, zoom blur
    - [ ] 3.3c-3 Four preset looks (News, Educational, Minimal, Energetic); showcase rendered in each
    - [ ] 3.3c-4 Free sound library with license log, sounds mapped to effects (moved forward from 7.3)
  - [ ] 3.3d Pack B: speaker effects (background swap/blur, outline glow, colour pop) and data cards (counter, charts, A vs B)
  - [ ] 3.3e Cards from the pilot: quote bubbles, checklist, headline wall, timeline, badge, spotlight
- [ ] 3.4 Layouts: full face, split screen, card over face, inside a phone (C)
- [ ] 3.5 New effects: list cards, progress bar, phone mock-up, orbit, pull-back, zoom-through, vertigo, UI/diagram scenes (C)
- [ ] 3.6 Preview + final render, −14 LUFS (C)

## Phase 4 — Brand system

- [ ] 4.1 Brand profile schema (`brand.yaml`, `sources.yaml`, `tokens.json`, `motion-system.md`) and the option catalog with brand defaults (C)
  - Include per-language filler words (e.g. "um", "ııı") passed to Whisper as a hint, so fillers are transcribed and cut instead of hiding inside a neighbouring word
- [ ] 4.2 Brand setup wizard (C)
- [ ] 4.3 Looks (style packs): 10 for v1, e.g. News, Educational, Minimal, Energetic, Corporate, Luxury, Tech, Warm/Lifestyle, Cinematic, Retro (C), approval (S)
- [ ] 4.4 Style card from reference videos (`extract-style`) (C), first references (S)
- [ ] 4.5 First profile: Random Talks Academy (S provides brand info, C sets it up)
- [ ] 4.6 Font pairs: 20 OFL pairs with Latin Extended support (C), selection (S)

## Phase 5 — Agents (LangGraph)

- [ ] 5.1 LLM adapters (C)
- [ ] 5.2 Scout + deduplication (C), source list (S)
- [ ] 5.3 Scorer (C), score approval on 20 samples (S)
- [ ] 5.4 Writer + verify/rewrite loop (C), tone approval (S)
- [ ] 5.5 Editor agent (edit plan) (C)
- [ ] 5.6 Visual QA agent (`qa-frames`) (C)
- [ ] 5.7 Project skills: `edit-raw-video`, `news-short`, `extract-style`, `qa-frames` (C)
- [ ] 5.8 Format and hook library: 20 proven short-form formats, 20 hook types, researched with sources (C), approval (S)

## Phase 6 — Control panel

- [ ] 6.1 Run and event log (every step, duration, tokens, cost) (C)
- [ ] 6.2 Panel: job list, live agent stream, stop / retry (C)
- [ ] 6.3 Approval screen: edit plan, preview, publish approval (C)
- [ ] 6.4 Brand wizard and settings in the panel; three-layer choice (one-click pack, guided wizard, expert mode), compatibility filter with "show all", search and favourites (C)
- [ ] 6.5 Optional Notion sync + mobile notifications (C)
- [ ] 6.6 Optional Langfuse connection (C)

## Phase 7 — Asset layer

- [ ] 7.1 Own files (`assets/`) + priority rule (C)
- [ ] 7.2 Pexels, Pixabay, Mixkit, Lottie clients + license log (C)
- [ ] 7.3 Sound library + sound showcase (C), selection (S)
- [ ] 7.4 Music options (C), selection (S)
- [ ] 7.5 `Generator` interface + AI generation plugins (Higgsfield and others), off by default, budget cap (C)
- [ ] 7.6 Voice-over: local free TTS (Piper); optional paid voice cloning plugin, off, own voice only (C)
- [ ] 7.7 Import any asset (image, video, audio, voice) with a required license field (C)

## Phase 8 — Upload your own video

- [ ] 8.1 `edit` and `polish` modes (C)
- [ ] 8.2 `clip` mode (C)
- [ ] 8.3 Test with own videos (S)
- [ ] 8.4 Duration and tempo presets (C)
- [ ] 8.5 Option review gate: every option tried on real videos, each marked keep / fix / remove (S); v1 milestone

## Phase 9 — Publishing

- [ ] 9.1 Platform layer: YouTube and Instagram profiles (C)
- [ ] 9.2 YouTube: Google Cloud project + OAuth (S), approved upload (C)
- [ ] 9.3 Instagram: app permission (S), temporary hosting + approved publish (C)
- [ ] 9.4 Calls to action: 12 types (C)

## Phase 10 — Automation

- [ ] 10.1 Scheduler (local cron + GitHub Actions) (C)
- [ ] 10.2 Secrets (S)
- [ ] 10.3 End-to-end test (S + C)

## Phase 11 — First real week (Random Talks Academy)

- [ ] 11.1 Produce and publish 3 videos (S + C)
- [ ] 11.2 Fix issues (C)
- [ ] 11.3 Metrics and token/time measurement (S + C)

## Phase 12 — Open source and CV

- [ ] 12.0 Gate: macOS install test from 2.8 passes (S)
- [ ] 12.1 README, screenshots, demo GIF (C, GIF S)
- [ ] 12.2 Scoring evaluation report (C)
- [ ] 12.3 DaVinci export, optional (C)
- [ ] 12.4 CV and LinkedIn copy (C)
