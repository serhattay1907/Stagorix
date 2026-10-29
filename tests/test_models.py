from pathlib import Path

import pytest

from stagorix import models
from stagorix.analysis.media import MediaError, decode_audio
from stagorix.analysis.transcribe import transcribe

ROOT = Path(__file__).resolve().parents[1]


def test_dockerfile_bakes_the_default_whisper_model() -> None:
    info = models.WHISPER_MODELS[models.DEFAULT_WHISPER]
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert f"snapshot_download('{info.repo}', local_dir='/opt/models/whisper/{info.name}')" in dockerfile


def test_dockerfile_bakes_yunet() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert (
        f"hf_hub_download('{models.YUNET.repo}', '{models.YUNET_FILE}', local_dir='/opt/models/yunet')"
        in dockerfile
    )


def test_every_model_records_source_and_license() -> None:
    for m in [*models.WHISPER_MODELS.values(), models.YUNET]:
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
