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
    revision: str | None = None


WHISPER_MODELS: dict[str, ModelInfo] = {
    m.name: m
    for m in [
        ModelInfo(name="tiny", repo="Systran/faster-whisper-tiny", license="MIT", size_mb=75),
        ModelInfo(name="base", repo="Systran/faster-whisper-base", license="MIT", size_mb=145),
        ModelInfo(
            name="small",
            repo="Systran/faster-whisper-small",
            license="MIT",
            size_mb=485,
            revision="536b0662742c02347bc0e980a01041f333bce120",
        ),
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
    snapshot_download(repo_id=info.repo, revision=info.revision, local_dir=target)
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


U2NET = ModelInfo(
    name="u2net_human_seg", repo="danielgatis/rembg (release v0.0.0)", license="Apache-2.0", size_mb=168
)
U2NET_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx"
U2NET_SHA256 = "01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c"


def u2net_path() -> Path:
    return models_dir() / "u2net" / "u2net_human_seg.onnx"


def ensure_u2net() -> Path:
    """Return the person-segmentation model, downloading it once and checking its SHA-256."""
    import hashlib
    import urllib.request

    path = u2net_path()
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".part")
    urllib.request.urlretrieve(U2NET_URL, tmp)
    digest = hashlib.sha256(tmp.read_bytes()).hexdigest()
    if digest != U2NET_SHA256:
        tmp.unlink()
        raise RuntimeError(f"u2net_human_seg checksum mismatch: {digest}")
    tmp.rename(path)
    return path


# Fast person matte for drafts (~4 ms/frame on CPU vs ~400 ms for U²-Net); edges are softer.
SELFIE = ModelInfo(
    name="mediapipe_selfie_segmentation",
    repo="onnx-community/mediapipe_selfie_segmentation",
    license="Apache-2.0",
    size_mb=1,
)
SELFIE_REVISION = "be49485c8e027524be38591817fc5cd31bd9d00e"
SELFIE_FILE = "onnx/model.onnx"
SELFIE_SHA256 = "3241ac4ad8aa35bdaf33946776db29f7c283a413aa0b0dacb9483594b4531aad"


def selfie_path() -> Path:
    return models_dir() / "selfie" / SELFIE_FILE


def ensure_selfie() -> Path:
    """Return the fast person-matte model, downloading it once (pinned revision, SHA-256 checked)."""
    import hashlib

    path = selfie_path()
    if not path.exists():
        from huggingface_hub import hf_hub_download

        hf_hub_download(
            repo_id=SELFIE.repo, filename=SELFIE_FILE, revision=SELFIE_REVISION, local_dir=path.parents[1]
        )
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != SELFIE_SHA256:
        path.unlink()
        raise RuntimeError(f"selfie segmentation checksum mismatch: {digest}")
    return path
