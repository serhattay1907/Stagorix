from pathlib import Path

import pytest

from stagorix import models
from stagorix.analysis.media import MediaError, decode_audio
from stagorix.analysis.transcribe import transcribe

ROOT = Path(__file__).resolve().parents[1]


def test_dockerfile_bakes_the_default_whisper_model() -> None:
    info = models.WHISPER_MODELS[models.DEFAULT_WHISPER]
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    target = f"/opt/models/whisper/{info.name}"
    assert f"snapshot_download('{info.repo}', revision='{info.revision}', local_dir='{target}')" in dockerfile


def test_dockerfile_keeps_download_caches_out_of_the_image() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert dockerfile.startswith("# syntax=docker/dockerfile:1")
    for cmd in ("uv sync", "npm ci", "stagorix sounds build"):
        lines = [ln for ln in dockerfile.splitlines() if cmd in ln and ln.startswith("RUN")]
        assert lines and all("--mount=type=cache" in ln for ln in lines), cmd


def test_user_footage_never_enters_the_build_context() -> None:
    ignored = (ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()
    assert {"workspace", "render/public/showcase-input"} <= set(ignored)


def test_dockerfile_bakes_yunet() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert (
        f"hf_hub_download('{models.YUNET.repo}', '{models.YUNET_FILE}', local_dir='/opt/models/yunet')"
        in dockerfile
    )


def test_dockerfile_bakes_u2net_with_checksum() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert models.U2NET_URL in dockerfile and models.U2NET_SHA256 in dockerfile


def test_dockerfile_bakes_the_pinned_selfie_model() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert (
        f"hf_hub_download('{models.SELFIE.repo}', '{models.SELFIE_FILE}', "
        f"revision='{models.SELFIE_REVISION}', local_dir='/opt/models/selfie')" in dockerfile
    )


def test_every_model_records_source_and_license() -> None:
    for m in [*models.WHISPER_MODELS.values(), models.YUNET, models.U2NET, models.SELFIE]:
        assert m.repo and m.license and m.size_mb > 0


def test_models_dir_follows_env(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("STAGORIX_MODELS_DIR", str(tmp_path / "m"))
    assert models.whisper_path("small") == tmp_path / "m" / "whisper" / "small"
    assert not models.is_downloaded("small")


def test_unknown_model_is_rejected(tmp_path) -> None:
    with pytest.raises(ValueError, match="unknown Whisper model"):
        transcribe(tmp_path / "x.wav", model="huge")


def test_missing_input_is_reported(tmp_path) -> None:
    with pytest.raises(MediaError, match="input not found"):
        decode_audio(tmp_path / "missing.wav")
