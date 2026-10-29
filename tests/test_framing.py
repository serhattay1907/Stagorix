import cv2
import numpy as np

from stagorix.analysis.framing import (
    TARGET_H,
    TARGET_W,
    crop_positions,
    crop_width_for,
    fit_to_target,
    smooth,
)
from stagorix.analysis.video import VideoInfo

LANDSCAPE = VideoInfo(width=1920, height=1080, fps=30, frames=90, has_audio=False)


def test_crop_width_is_full_height_9_16_and_even() -> None:
    assert crop_width_for(LANDSCAPE) == 608
    portrait = VideoInfo(width=1080, height=1920, fps=30, frames=1, has_audio=False)
    assert crop_width_for(portrait) == 1080


LONG = VideoInfo(width=1920, height=1080, fps=30, frames=900, has_audio=False)


def test_no_face_keeps_crop_centred() -> None:
    xs = crop_positions(np.full(90, np.nan), LANDSCAPE)
    assert set(xs) == {(1920 - 608) / 2}


def test_head_sway_keeps_camera_still() -> None:
    """Natural head movement (±25 px, as measured on a real talking-head clip) must not move the camera."""
    t = np.arange(900) / 30
    centres = 925 + 25 * np.sin(2 * np.pi * t / 3) + np.random.default_rng(0).normal(0, 4, 900)
    xs = crop_positions(centres, LONG)
    assert max(xs) - min(xs) < 0.01


def test_camera_follows_a_real_move_smoothly() -> None:
    centres = np.r_[np.full(300, 700.0), np.full(600, 1300.0)]  # speaker steps to the right
    xs = crop_positions(centres, LONG)
    assert xs[0] < 450 and xs[-1] > 900, "face brought back into the frame"
    assert all(a <= b + 1e-6 for a, b in zip(xs, xs[1:], strict=False)), "one direction, no jitter"
    assert max(b - a for a, b in zip(xs, xs[1:], strict=False)) < 30, "eased, no jump"


def test_crop_stays_inside_frame() -> None:
    centres = np.full(90, np.nan)
    centres[0], centres[89] = 100.0, 1900.0
    xs = crop_positions(centres, LANDSCAPE)
    assert min(xs) >= 0 and max(xs) <= 1920 - 608


def test_smoothing_is_frame_rate_independent() -> None:
    step = np.r_[np.zeros(30), np.ones(30)]
    slow = smooth(np.repeat(step, 2), fps=60)[::2]
    fast = smooth(step, fps=30)
    assert np.allclose(slow, fast, atol=0.05)


def test_fit_pads_narrow_crops_without_distortion() -> None:
    narrow = np.full((1920, 540, 3), 255, np.uint8)
    out = fit_to_target(narrow, cv2)
    assert out.shape == (TARGET_H, TARGET_W, 3)
    assert out[:, 0].max() == 0 and out[:, TARGET_W // 2].min() == 255
