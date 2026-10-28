# Decision log

Append-only. Newest first. Each entry names the principle(s) it serves (P1–P7, see `CLAUDE.md`). To reverse a decision, add a new entry that supersedes it.

| Date | Decision | Rationale | Principle |
| --- | --- | --- | --- |
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
