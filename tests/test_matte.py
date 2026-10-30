import shutil
import subprocess
from pathlib import Path

import numpy as np
import pytest

from stagorix.analysis.matte import Matte, Quality, merge_ranges, plan_ranges, write_mattes
from stagorix.render.motion import EditPlan

PLAN = Path(__file__).resolve().parents[1] / "examples" / "plans" / "showcase.json"


def test_ranges_are_padded_clamped_and_merged() -> None:
    assert merge_ranges([(5.0, 6.0), (0.1, 1.0), (6.3, 7.0)], pad=0.25) == [(0.0, 1.25), (4.75, 7.25)]


def test_plan_ranges_are_the_speaker_effects() -> None:
    plan = EditPlan.model_validate_json(PLAN.read_text(encoding="utf-8"))
    ranges = plan_ranges(plan)
    assert len(ranges) == 4
    assert ranges[0] == pytest.approx((40.8, 43.2))


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")
def test_draft_mattes_only_for_the_requested_seconds(tmp_path) -> None:
    src = tmp_path / "v.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=270x480:rate=10:duration=3"]
        + ["-pix_fmt", "yuv420p", str(src)],
        check=True,
    )
    pytest.importorskip("onnxruntime")
    try:
        result = write_mattes(src, tmp_path / "m", Quality.DRAFT, ranges=[(1.0, 1.5)])
    except Exception as exc:  # model download unavailable offline
        pytest.skip(f"model not available: {exc}")
    files = sorted(p.name for p in (tmp_path / "m").glob("*.png"))
    # 0.75–1.75 s at 10 fps → frames 8..17
    assert files[0] == "00008.png" and files[-1] == "00017.png" and result.written == len(files) == 10
    saved = Matte.model_validate_json((tmp_path / "m" / "matte.json").read_text(encoding="utf-8"))
    assert saved.quality is Quality.DRAFT and saved.frames == 30

    import cv2

    mask = cv2.imread(str(tmp_path / "m" / files[0]), cv2.IMREAD_GRAYSCALE)
    assert mask.shape == (960, 540) and mask.dtype == np.uint8


def test_clean_mask_drops_haze_and_loose_blobs() -> None:
    from stagorix.analysis.matte import clean_mask

    m = np.full((960, 540), 40, np.uint8)  # faint haze over the background
    m[300:900, 150:390] = 230  # the speaker
    m[50:70, 20:40] = 230  # a small loose blob
    out = clean_mask(m)
    assert out[600, 270] > 200
    assert out[60, 30] == 0 and out[10, 500] == 0


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")
def test_plate_removes_the_speaker(tmp_path) -> None:
    import cv2

    from stagorix.analysis.matte import write_plate

    frames = tmp_path / "f"
    frames.mkdir()
    mattes = tmp_path / "m"
    mattes.mkdir()
    for i in range(10):
        img = np.full((960, 540, 3), (200, 120, 40), np.uint8)  # blue-ish background (BGR)
        x = 60 + i * 40
        img[300:700, x : x + 100] = (20, 20, 220)  # a red "speaker" that moves
        cv2.imwrite(str(frames / f"{i:03d}.png"), img)
        mask = np.zeros((960, 540), np.uint8)
        mask[300:700, x : x + 100] = 255
        cv2.imwrite(str(mattes / f"{i:05d}.png"), mask)
    video = tmp_path / "v.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-framerate",
            "10",
            "-i",
            str(frames / "%03d.png"),
            "-pix_fmt",
            "yuv420p",
            str(video),
        ],
        check=True,
    )
    plate = cv2.imread(str(write_plate(video, mattes, tmp_path / "plate.jpg", samples=10)))
    b, g, r = plate[500, 270].astype(int)
    assert r < 90 and b > 150  # background colour, no red speaker left
