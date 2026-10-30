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
| `docs/MOTION.md` | Motion language: effect roles, intensity, brand rules |
| `docs/ROADMAP.md` | Phases and tasks — the source of truth for progress |
| `brands/<slug>/` | Brand profiles (schema in phase 4) |
| `stagorix/` | Python core: `cli.py`, `doctor.py` and one subpackage per area (analysis, agents, llm, brands, assets, render, platforms, panel, runs) |
| `render/` | Remotion project: `compositions/`, `effects/`, `layouts/` |
| `tests/` | Python tests (`uv run pytest`) |

## Working rules

- Work in small, reviewable steps. After each step, report what changed and wait for the owner's go-ahead before starting the next.
- The owner makes decisions. Present options with trade-offs and a recommendation; state assumptions explicitly.
- Git workflow: Claude may create branches, commit and push without asking, then gives the owner a ready PR title and description. The owner opens the pull request on GitHub and merges it. Claude never opens PRs itself (its tooling appends attribution) and never pushes to `main`.
- No AI tool attribution anywhere: no `Co-Authored-By` trailers, session links or "Generated with" lines in commits, PRs, docs or code. If a credit seems genuinely needed, ask the owner first.
- Deletion and any other irreversible action only with explicit approval.
- Give honest critique; flag conflicts with the principles instead of working around them.
- Every step names the expertise it needs (editor, brand, social media, sound, UI/UX, security, licensing, architecture …) and is decided the way that expert would decide. Decisions cite their basis: current sources, data or our own measurements, recorded in `docs/DECISIONS.md`.
- Everything that matters is committed; ephemeral environments lose uncommitted work.
- When a decision is made, add it to `docs/DECISIONS.md`. When a task finishes, tick it in `docs/ROADMAP.md`.

## Commands

| Task | Command |
| --- | --- |
| Install Python deps | `uv sync` |
| CLI | `uv run stagorix --help` |
| Environment check | `uv run stagorix doctor` |
| Analyze a video | `uv run stagorix analyze <file> [--language xx] [--cutout-seconds 3] [--skip-transcript\|--skip-framing\|--skip-voice]` |
| Find flubs in a transcript | `uv run stagorix flubs <transcript.json> [--review]` |
| Preview with approved flub edits | `uv run stagorix cut <video> [--flubs flubs.json]` |
| Effect showcase video | `uv run stagorix showcase [--theme theme.json] [--footage workspace/analysis/<name>]` (in Docker: `docker compose run --rm worker stagorix showcase`) |
| Looks (style packs) | `uv run stagorix looks [--render]` · `uv run stagorix showcase --look <id>` |
| Person mattes for speaker effects | `uv run stagorix matte <video or analysis folder> [--quality draft\|final] [--plan plan.json]` |
| Sound library | `uv run stagorix sounds list [-c <category>]` · `uv run stagorix sounds build` · `uv run stagorix sounds reel [-c <category>]` |
| Effect library / check an edit plan | `uv run stagorix effects` · `uv run stagorix check-plan <plan.json> [--rules rules.json]` |
| Models | `uv run stagorix models list` · `uv run stagorix models download <name>` |
| Tests | `uv run pytest` |
| Lint / format | `uv run ruff check .` · `uv run ruff format .` |
| Render deps | `cd render && npm ci` |
| Typecheck render | `cd render && npm run typecheck` |
| Remotion Studio | `cd render && npm run studio` |
| Remotion agent skills (local, never committed) | `cd render && npx skills add remotion-dev/skills` |
| Docker, CPU (default) | `docker compose up --build` |
| Golden test (canonical, in Docker) | `docker compose run --rm worker stagorix verify` |
| Rewrite golden references | `docker compose run --rm worker stagorix verify --update` |
| Docker, NVIDIA GPU | `docker compose -f compose.yaml -f compose.gpu.yaml up --build` |

## Code conventions

- Python 3.12, typed, Pydantic models for every agent input/output.
- TypeScript for Remotion; every effect/component has a Zod schema for its props.
- Effects take colors, fonts, radius and motion from the theme (`useTheme()`, `render/src/theme/`), never as literals; text and timings (in seconds) come from props. New effects appear in the `Showcase` composition and get a role and intensity in `stagorix/render/motion.py` (see `docs/MOTION.md`).
- Pin every dependency version (`uv.lock`, `package-lock.json`, Docker image digests).
- A command that is not built yet says so and exits with code 2; never a silent no-op.
- `zod` is pinned to the exact version Remotion depends on; upgrade both together.
- Media (raw videos, renders, cutouts, models) is never committed. Exceptions: the small golden-test files in `tests/golden/` (frames produced inside Docker, a synthetic speech sample).
- Personal, local-only notes for a contributor go in `CLAUDE.local.md` (gitignored).
- Third-party files are never vendored without a clear, compatible license. Project skills (our own) live in `.agents/skills/<name>/`.
