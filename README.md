# Stagorix

Provider-agnostic, local-first multi-agent pipeline that turns news and your own videos into branded, captioned vertical videos for YouTube Shorts and Instagram Reels (LangGraph + Whisper + Remotion).

> **Status:** early development (Phase 2 of 12). Not usable yet. See the [roadmap](docs/ROADMAP.md).

- **Brand-agnostic core:** every brand, person or organization lives in its own `brands/<slug>/` profile.
- **Runs everywhere:** same steps and same output on macOS, Windows and Linux (Docker, CPU by default, optional GPU).
- **You stay in control:** every run, step and cost is visible, and nothing is published without your approval.

## Modes

| Mode | You give | You get |
| --- | --- | --- |
| News | Nothing — sources are scanned | Script + video |
| `edit` | Raw talking-head footage | Cut, captioned video with effects |
| `polish` | An edited video | Same video, branded and captioned |
| `clip` | A long video | 3–5 short candidates |

## Development

**With Docker (recommended, same on macOS, Windows and Linux):**

```bash
docker compose up --build                                        # CPU (default)
docker compose -f compose.yaml -f compose.gpu.yaml up --build    # NVIDIA GPU, Linux or Windows WSL2
```

**Without Docker:** Python 3.12, [uv](https://docs.astral.sh/uv/), Node.js 22 and ffmpeg.

```bash
uv sync
uv run stagorix doctor
uv run pytest
cd render && npm ci && npm run typecheck
```

**Optional, for AI coding agents:** Remotion's official agent skills improve generated Remotion code. They are installed locally and never committed:

```bash
cd render && npx skills add remotion-dev/skills
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Motion language](docs/MOTION.md)
- [References](docs/REFERENCES.md)
- [Contributor instructions for Claude Code](CLAUDE.md)

## License

Stagorix is [MIT](LICENSE) licensed.

It renders video with [Remotion](https://www.remotion.dev), which has its own license: free for individuals, non-profits and for-profit organizations with up to 3 employees; larger organizations need a [Remotion Company License](https://www.remotion.pro/license). Check it before using Stagorix in a larger company.
