"""Environment checks. Same checks on macOS, Windows and Linux."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from enum import StrEnum

from pydantic import BaseModel


class Status(StrEnum):
    OK = "ok"
    WARN = "warn"
    FAIL = "fail"


class Check(BaseModel):
    name: str
    status: Status
    detail: str
    hint: str = ""


def _version_of(cmd: list[str]) -> str | None:
    """Return the first output line of a version command, or None if the tool is missing."""
    if shutil.which(cmd[0]) is None:
        return None
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=10, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return None
    text = (out.stdout or out.stderr).strip()
    return text.splitlines()[0] if text else ""


def _major(version: str) -> int | None:
    digits = version.lstrip("v").split(".")[0]
    return int(digits) if digits.isdigit() else None


def check_python() -> Check:
    v = sys.version_info
    ok = (v.major, v.minor) >= (3, 12)
    return Check(
        name="Python",
        status=Status.OK if ok else Status.FAIL,
        detail=f"{v.major}.{v.minor}.{v.micro}",
        hint="" if ok else "Python 3.12 or newer is required.",
    )


def check_node() -> Check:
    out = _version_of(["node", "--version"])
    if out is None:
        return Check(
            name="Node.js",
            status=Status.FAIL,
            detail="not found",
            hint="Install Node.js 22 LTS (needed for rendering).",
        )
    major = _major(out)
    ok = major is not None and major >= 22
    return Check(
        name="Node.js",
        status=Status.OK if ok else Status.WARN,
        detail=out,
        hint="" if ok else "Node.js 22 LTS is the tested version.",
    )


def check_ffmpeg() -> Check:
    out = _version_of(["ffmpeg", "-version"])
    if out is None:
        return Check(
            name="ffmpeg",
            status=Status.FAIL,
            detail="not found",
            hint="Install ffmpeg, or use the Docker setup which includes it.",
        )
    return Check(name="ffmpeg", status=Status.OK, detail=out.removeprefix("ffmpeg version ").split(" ")[0])


def check_docker() -> Check:
    out = _version_of(["docker", "--version"])
    if out is None:
        return Check(
            name="Docker",
            status=Status.WARN,
            detail="not found",
            hint="Optional for local development; required for the standard setup.",
        )
    return Check(name="Docker", status=Status.OK, detail=out)


def in_container() -> bool:
    """True inside the Stagorix image (env var set in the Dockerfile)."""
    return os.environ.get("STAGORIX_IN_CONTAINER") == "1"


def run_checks() -> list[Check]:
    checks = [check_python(), check_node(), check_ffmpeg()]
    if not in_container():
        checks.append(check_docker())
    return checks


def system_summary() -> str:
    where = " · Docker" if in_container() else ""
    return f"{platform.system()} {platform.release()} ({platform.machine()}){where}"
