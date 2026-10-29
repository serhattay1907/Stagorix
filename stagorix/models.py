"""Where ML models live and which ones are known.

Models baked into the Docker image sit in /opt/models (STAGORIX_MODELS_DIR).
Outside Docker they go to ~/.cache/stagorix/models. Larger models are
downloaded on first use, and the download is announced (principle 3).
"""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel


class ModelInfo(BaseModel):
    name: str
    repo: str
    license: str
    size_mb: int


WHISPER_MODELS: dict[str, ModelInfo] = {
    m.name: m
    for m in [
        ModelInfo(name="tiny", repo="Systran/faster-whisper-tiny", license="MIT", size_mb=75),
        ModelInfo(name="base", repo="Systran/faster-whisper-base", license="MIT", size_mb=145),
        ModelInfo(name="small", repo="Systran/faster-whisper-small", license="MIT", size_mb=485),
        ModelInfo(name="medium", repo="Systran/faster-whisper-medium", license="MIT", size_mb=1530),
        ModelInfo(name="large-v3", repo="Systran/faster-whisper-large-v3", license="MIT", size_mb=3090),
    ]
}
DEFAULT_WHISPER = "small"


def models_dir() -> Path:
    env = os.environ.get("STAGORIX_MODELS_DIR")
    path = Path(env) if env else Path.home() / ".cache" / "stagorix" / "models"
    path.mkdir(parents=True, exist_ok=True)
    return path


def whisper_path(name: str) -> Path:
    return models_dir() / "whisper" / name


def is_downloaded(name: str) -> bool:
    return (whisper_path(name) / "model.bin").exists()


def download_whisper(name: str) -> Path:
    """Download a Whisper model once; later runs reuse it."""
    from huggingface_hub import snapshot_download

    info = WHISPER_MODELS[name]
    target = whisper_path(name)
    snapshot_download(repo_id=info.repo, local_dir=target)
    return target


YUNET = ModelInfo(name="yunet-2023mar", repo="opencv/face_detection_yunet", license="MIT", size_mb=1)
YUNET_FILE = "face_detection_yunet_2023mar.onnx"


def yunet_path() -> Path:
    return models_dir() / "yunet" / YUNET_FILE


def ensure_yunet() -> Path:
    """Return the YuNet face detector, downloading it (~0.2 MB) on first use."""
    path = yunet_path()
    if not path.exists():
        from huggingface_hub import hf_hub_download

        hf_hub_download(repo_id=YUNET.repo, filename=YUNET_FILE, local_dir=path.parent)
    return path
