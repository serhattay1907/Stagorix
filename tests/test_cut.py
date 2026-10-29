import shutil
import subprocess

import pytest
from typer.testing import CliRunner

from stagorix.analysis.cut import plan_cuts, render_preview
from stagorix.analysis.models import Flub, FlubAction, FlubKind, FlubReport, Transcript, Word
from stagorix.analysis.video import probe
from stagorix.cli import app


def flub(start, end, action, approved=True, keep=0.0, kind=FlubKind.PAUSE) -> Flub:  # type: ignore[no-untyped-def]
    return Flub(
        kind=kind,
        start=start,
        end=end,
        text="x",
        confidence=0.9,
        action=action,
        keep=keep,
        detail="",
        approved=approved,
    )


def report(*flubs: Flub) -> FlubReport:
    return FlubReport(source="v", language="xx", letter_seconds=0.07, approve_from=0.6, flubs=list(flubs))


def test_shorten_keeps_the_pause_around_its_middle() -> None:
    plan = plan_cuts(report(flub(2.0, 3.0, FlubAction.SHORTEN, keep=0.4)), 10.0)
    assert plan.keep == [(0.0, 2.2), (2.8, 10.0)]
    assert plan.removed == 0.6 and plan.edits == 1


def test_cut_removes_the_first_take() -> None:
    plan = plan_cuts(report(flub(1.0, 2.5, FlubAction.CUT, kind=FlubKind.REPEAT)), 5.0)
    assert plan.keep == [(0.0, 1.0), (2.5, 5.0)]


def test_rejected_and_review_flubs_change_nothing() -> None:
    plan = plan_cuts(
        report(
            flub(1.0, 2.0, FlubAction.SHORTEN, approved=False, keep=0.2),
            flub(3.0, 4.0, FlubAction.REVIEW, kind=FlubKind.STRETCH),
        ),
        5.0,
    )
    assert plan.keep == [(0.0, 5.0)] and plan.removed == 0 and plan.edits == 0


def test_overlapping_edits_are_merged() -> None:
    plan = plan_cuts(
        report(flub(1.0, 3.0, FlubAction.CUT), flub(2.5, 4.0, FlubAction.SHORTEN, keep=0.2)), 6.0
    )
    assert plan.keep == [(0.0, 1.0), (3.9, 6.0)]


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")
def test_preview_is_shorter_by_the_removed_time(tmp_path) -> None:
    src = tmp_path / "in.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=size=320x240:rate=30:duration=4",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=4",
            "-shortest",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            str(src),
        ],
        check=True,
    )
    out = tmp_path / "preview.mp4"
    plan = render_preview(src, report(flub(1.0, 2.0, FlubAction.CUT)), out)
    info = probe(out)
    assert abs(info.frames / info.fps - (4.0 - plan.removed)) < 0.1 and info.has_audio


def test_review_lets_the_user_reject_a_suggestion(tmp_path) -> None:
    words = [
        Word(text="Merhaba.", start=0.0, end=0.5, probability=0.9),
        Word(text="Bugün", start=1.5, end=1.9, probability=0.9),
    ]
    t = tmp_path / "transcript.json"
    t.write_text(
        Transcript(
            source="v", language="xx", language_detected=True, model="small", duration=2.0, words=words
        ).model_dump_json(),
        encoding="utf-8",
    )
    result = CliRunner().invoke(app, ["flubs", str(t), "--review"], input="n\n")
    assert result.exit_code == 0, result.output
    saved = FlubReport.model_validate_json((tmp_path / "flubs.json").read_text(encoding="utf-8"))
    assert [f.approved for f in saved.flubs] == [False]
