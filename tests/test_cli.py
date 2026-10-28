from typer.testing import CliRunner

from stagorix import __version__
from stagorix.cli import NOT_IMPLEMENTED_EXIT, app

runner = CliRunner()


def test_version() -> None:
    result = runner.invoke(app, ["--version"])
    assert result.exit_code == 0
    assert __version__ in result.output


def test_planned_commands_fail_loudly() -> None:
    for args in (["run", "edit", "--brand", "demo"], ["panel"], ["brand", "list"], ["brand", "new"]):
        result = runner.invoke(app, args)
        assert result.exit_code == NOT_IMPLEMENTED_EXIT, args
        assert "not implemented yet" in result.output
