# Stagorix — instructions for Claude Code

Stagorix is an open-source, brand-agnostic, multi-agent pipeline that turns news and a user's own videos into branded, captioned vertical videos (YouTube Shorts, Instagram Reels). Read this file before any change; every proposal and code decision is checked against the principles below.

## Core principles (non-negotiable)

1. **Brand-agnostic.** The core is shared. Everything brand-specific (name, colors, fonts, tone, language, sources, motion system, logo) lives in `brands/<slug>/`. Never hard-code a brand name, color, text or language in core code. One brand's settings never affect another's. Random Talks Academy is only the first test brand.
2. **Runs everywhere.** macOS (Apple Silicon and Intel), Windows (Docker Desktop + WSL2) and Linux install with the same steps and produce the same output, verified by the golden test. CPU profile is the default, GPU is optional. A feature that works on only one OS stays optional and is documented for all three.
3. **User in control.** Every step, duration, cost and approval point is visible. Nothing is published without explicit approval. Errors are never swallowed; they are logged and shown to the user.

## Supporting principles

4. **Security.** Tokens and keys never enter the repo, logs or chat. Use `.env` (gitignored) and `.env.example` with placeholders. User data stays local.
5. **Cost.** Free by default. Paid services are opt-in plugins with a budget cap.
6. **Licensing.** Only licensed assets. Every asset's source, license and attribution is recorded.
7. **Independence.** No lock-in to one LLM or service. Providers sit behind adapters and are swappable.

## Language

- Generated content language is set per brand profile (any language, or several). The core is language-neutral: no language-specific strings or assumptions in core code.
- Code, identifiers, commit messages, docs and README are in English.

## Repository map

| Path | Purpose |
| --- | --- |
| `pilot/` | Phase 1 throwaway prototypes. Read-only reference; do not extend or import from it. |
| `docs/ARCHITECTURE.md` | System design |
| `docs/DECISIONS.md` | Decision log (append-only) |
| `docs/ROADMAP.md` | Phases and tasks — the source of truth for progress |
| `brands/<slug>/` | Brand profiles *(Phase 4)* |
| `stagorix/` | Python core: analysis, agents, CLI *(Phase 2.4+)* |
| `render/` | Remotion project and effect library *(Phase 2.4+)* |

## Working rules

- Work in small, reviewable steps. After each step, report what changed and wait for the owner's go-ahead before starting the next.
- The owner makes decisions. Present options with trade-offs and a recommendation; state assumptions explicitly.
- Git workflow: Claude may create branches, commit, push and open pull requests without asking. Merging into `main` is always done by the owner. Never push to `main` directly.
- Deletion and any other irreversible action only with explicit approval.
- Give honest critique; flag conflicts with the principles instead of working around them.
- Everything that matters is committed; ephemeral environments lose uncommitted work.
- When a decision is made, add it to `docs/DECISIONS.md`. When a task finishes, tick it in `docs/ROADMAP.md`.

## Code conventions

- Python 3.12, typed, Pydantic models for every agent input/output.
- TypeScript for Remotion; every effect/component has a Zod schema for its props.
- Pin every dependency version (Python lock file, `package-lock.json`, Docker image digests).
- Media (raw videos, renders, cutouts, models) is never committed.
- Personal, local-only notes for a contributor go in `CLAUDE.local.md` (gitignored).
