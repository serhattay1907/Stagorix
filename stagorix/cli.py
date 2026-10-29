"""Command-line entry point.

Commands that are not built yet say so and exit with code 2, so nothing
fails silently (principle 3).
"""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path
from typing import Annotated, NoReturn

import typer
from rich.console import Console
from rich.table import Table

from stagorix import __version__
from stagorix.doctor import Status, run_checks, system_summary

app = typer.Typer(
    help="Turn news and your own videos into branded vertical videos.",
    no_args_is_help=True,
    add_completion=False,
)
brand_app = typer.Typer(help="Manage brand profiles.", no_args_is_help=True)
app.add_typer(brand_app, name="brand")
models_app = typer.Typer(help="List and download ML models.", no_args_is_help=True)
app.add_typer(models_app, name="models")

console = Console()

NOT_IMPLEMENTED_EXIT = 2


class Mode(StrEnum):
    NEWS = "news"
    EDIT = "edit"
    POLISH = "polish"
    CLIP = "clip"


def _planned(feature: str, phase: str) -> NoReturn:
    console.print(f"[yellow]{feature} is not implemented yet[/yellow] (roadmap phase {phase}).")
    raise typer.Exit(code=NOT_IMPLEMENTED_EXIT)


def _version_callback(value: bool) -> None:
    if value:
        console.print(f"stagorix {__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: Annotated[
        bool,
        typer.Option("--version", callback=_version_callback, is_eager=True, help="Show version and exit."),
    ] = False,
) -> None:
    """Stagorix command-line interface."""


@app.command()
def doctor() -> None:
    """Check that the tools Stagorix needs are installed."""
    checks = run_checks()
    table = Table(title=f"Stagorix {__version__} · {system_summary()}")
    table.add_column("Check")
    table.add_column("Status")
    table.add_column("Detail")
    table.add_column("Hint")
    style = {Status.OK: "green", Status.WARN: "yellow", Status.FAIL: "red"}
    for c in checks:
        table.add_row(c.name, f"[{style[c.status]}]{c.status}[/]", c.detail, c.hint)
    console.print(table)
    if any(c.status is Status.FAIL for c in checks):
        raise typer.Exit(code=1)


@app.command()
def verify(
    update: Annotated[
        bool, typer.Option("--update", help="Rewrite the golden references (run inside Docker).")
    ] = False,
    browser: Annotated[
        str | None,
        typer.Option("--browser-executable", help="Use this Chrome/Chromium instead of Remotion's."),
    ] = None,
) -> None:
    """Golden test: render a fixed video and compare it with the references."""
    from stagorix.verify import OUT_DIR, run_verify

    steps = run_verify(update=update, browser=browser)
    table = Table(title=f"Stagorix verify · {system_summary()}")
    table.add_column("Step")
    table.add_column("Result")
    table.add_column("Time")
    table.add_column("Detail")
    for s in steps:
        table.add_row(s.name, "[green]ok[/]" if s.ok else "[red]fail[/]", f"{s.seconds:.1f}s", s.detail)
    console.print(table)
    console.print(f"Output: {OUT_DIR}")
    if not all(s.ok for s in steps):
        raise typer.Exit(code=1)


@app.command()
def run(
    mode: Annotated[Mode, typer.Argument(help="Input mode.")],
    brand: Annotated[str, typer.Option("--brand", "-b", help="Brand profile slug.")],
    source: Annotated[
        str | None, typer.Option("--input", "-i", help="Input video (edit, polish, clip).")
    ] = None,
) -> None:
    """Produce a video for a brand. Nothing is published without approval."""
    phase = {Mode.NEWS: "5", Mode.EDIT: "8.1", Mode.POLISH: "8.1", Mode.CLIP: "8.2"}[mode]
    _planned(f"'{mode}' mode", phase)


@app.command()
def panel() -> None:
    """Open the control panel on localhost."""
    _planned("The control panel", "6")


@brand_app.command("list")
def brand_list() -> None:
    """List brand profiles."""
    _planned("Brand profiles", "4.1")


@brand_app.command("new")
def brand_new() -> None:
    """Create a brand profile with the setup wizard."""
    _planned("The brand setup wizard", "4.2")


@models_app.command("list")
def models_list() -> None:
    """Show known models, their license and whether they are downloaded."""
    from stagorix import models

    table = Table(title=f"Models · {models.models_dir()}")
    for col in ("Kind", "Name", "Size", "License", "Source", "Downloaded"):
        table.add_column(col)
    for m in models.WHISPER_MODELS.values():
        default = " (default)" if m.name == models.DEFAULT_WHISPER else ""
        here = "[green]yes[/]" if models.is_downloaded(m.name) else "no"
        table.add_row("whisper", m.name + default, f"{m.size_mb} MB", m.license, m.repo, here)
    y = models.YUNET
    here = "[green]yes[/]" if models.yunet_path().exists() else "no"
    table.add_row("face", y.name, "<1 MB", y.license, y.repo, here)
    console.print(table)


@models_app.command("download")
def models_download(name: Annotated[str, typer.Argument(help="Whisper model name, e.g. small.")]) -> None:
    """Download a model now instead of on first use."""
    from stagorix import models

    if name not in models.WHISPER_MODELS:
        console.print(f"[red]Unknown model '{name}'.[/] Known: {', '.join(models.WHISPER_MODELS)}")
        raise typer.Exit(code=1)
    info = models.WHISPER_MODELS[name]
    console.print(f"Downloading whisper/{name} (~{info.size_mb} MB, {info.license}) from {info.repo} …")
    path = models.download_whisper(name)
    console.print(f"[green]Done:[/] {path}")


@app.command()
def analyze(
    source: Annotated[Path, typer.Argument(help="Input video or audio file.", exists=True, dir_okay=False)],
    language: Annotated[
        str | None,
        typer.Option("--language", "-l", help="Spoken language code, e.g. en. Detected if omitted."),
    ] = None,
    whisper_model: Annotated[str, typer.Option("--whisper-model", help="Whisper model size.")] = "small",
    out: Annotated[Path | None, typer.Option("--out", help="Output folder.")] = None,
    skip_transcript: Annotated[bool, typer.Option("--skip-transcript", help="Skip transcription.")] = False,
    skip_framing: Annotated[
        bool, typer.Option("--skip-framing", help="Skip face tracking and 9:16 crop.")
    ] = False,
) -> None:
    """Analyze a video: word-level transcript, face tracking and a 9:16 vertical cut."""
    import time

    from rich.progress import BarColumn, Progress, TextColumn, TimeElapsedColumn

    from stagorix import models
    from stagorix.analysis.media import MediaError

    out_dir = out or Path("workspace") / "analysis" / source.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    table = Table(title=f"Analysis · {source.name}")
    for col in ("Step", "Result", "Time", "Detail"):
        table.add_column(col)
    failed = False

    def run_step(label: str, fn) -> object | None:  # type: ignore[no-untyped-def]
        nonlocal failed
        start = time.perf_counter()
        try:
            with Progress(TextColumn(label), BarColumn(), TimeElapsedColumn(), console=console) as bar:
                task = bar.add_task(label, total=1.0)
                result = fn(lambda f: bar.update(task, completed=f))
        except Exception as exc:  # shown in the table, never swallowed (principle 3)
            failed = True
            kind = "" if isinstance(exc, MediaError | ValueError) else f"{type(exc).__name__}: "
            table.add_row(label, "[red]fail[/]", f"{time.perf_counter() - start:.1f}s", f"{kind}{exc}")
            return None
        return result, time.perf_counter() - start

    if not skip_transcript:
        from stagorix.analysis.transcribe import transcribe

        if whisper_model in models.WHISPER_MODELS and not models.is_downloaded(whisper_model):
            info = models.WHISPER_MODELS[whisper_model]
            size = f"~{info.size_mb} MB, {info.license}"
            console.print(f"[yellow]First use:[/] downloading whisper/{whisper_model} ({size}).")
        done = run_step(
            "Transcript",
            lambda p: transcribe(source, model=whisper_model, language=language, on_progress=p),
        )
        if done:
            transcript, seconds = done
            (out_dir / "transcript.json").write_text(transcript.model_dump_json(indent=2), encoding="utf-8")
            lang = f"{transcript.language} ({'detected' if transcript.language_detected else 'given'})"
            detail = (
                f"{len(transcript.words)} words · {transcript.duration:.1f}s · {lang} · {transcript.model}"
                " → transcript.json"
            )
            table.add_row("Transcript", "[green]ok[/]", f"{seconds:.1f}s", detail)

    if not skip_framing:
        from stagorix.analysis.framing import render_vertical, track_faces

        done = run_step("Face tracking", lambda p: track_faces(source, on_progress=p))
        if done:
            track, seconds = done
            (out_dir / "face_track.json").write_text(track.model_dump_json(), encoding="utf-8")
            status = "[green]ok[/]" if track.face_ratio >= 0.5 else "[yellow]warn[/]"
            note = "" if track.face_ratio >= 0.5 else " · few faces found, crop stays near centre"
            detail = f"face in {track.face_ratio:.0%} of sampled frames{note} → face_track.json"
            table.add_row("Face tracking", status, f"{seconds:.1f}s", detail)
            done = run_step(
                "Vertical 9:16", lambda p: render_vertical(source, track, out_dir / "vertical.mp4", p)
            )
            if done:
                _, seconds = done
                table.add_row("Vertical 9:16", "[green]ok[/]", f"{seconds:.1f}s", "1080×1920 → vertical.mp4")

    console.print(table)
    console.print(f"Output: {out_dir}")
    if failed:
        raise typer.Exit(code=1)
