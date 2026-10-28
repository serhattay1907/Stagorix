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

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributor instructions for Claude Code](CLAUDE.md)

## License

[MIT](LICENSE)
