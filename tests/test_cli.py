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


def test_doctor_skips_docker_check_in_container(monkeypatch) -> None:
    from stagorix.doctor import run_checks

    monkeypatch.setenv("STAGORIX_IN_CONTAINER", "1")
    assert "Docker" not in [c.name for c in run_checks()]
    monkeypatch.delenv("STAGORIX_IN_CONTAINER")
    assert "Docker" in [c.name for c in run_checks()]
