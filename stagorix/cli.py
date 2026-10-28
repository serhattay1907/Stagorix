"""Command-line entry point.

Commands that are not built yet say so and exit with code 2, so nothing
fails silently (principle 3).
"""

from __future__ import annotations

from enum import StrEnum
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
