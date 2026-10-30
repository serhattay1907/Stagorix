# syntax=docker/dockerfile:1
# One image, two bases: CPU (default) and NVIDIA GPU (compose.gpu.yaml).
# Base images are pinned by digest; Dependabot proposes updates. The GPU base
# (compose.gpu.yaml) is pinned by tag until it can be resolved and tested on a GPU machine.

ARG BASE_IMAGE=debian:bookworm-slim@sha256:99c0b25c46d0214d5a2091092e7908907dcaecd6a962cde0ac700acee222b6f3
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.11.32@sha256:df4cae8f3a96d175e2e5f992e597550000edbe78fdc2594d5cd8de1a217f504c

FROM ${NODE_IMAGE} AS node
FROM ${UV_IMAGE} AS uv

FROM ${BASE_IMAGE} AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    STAGORIX_IN_CONTAINER=1 \
    UV_PYTHON_INSTALL_DIR=/opt/python \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    STAGORIX_MODELS_DIR=/opt/models \
    PATH=/opt/venv/bin:$PATH

# ffmpeg, fonts (Noto covers Latin, Greek, Cyrillic and emoji) and the
# shared libraries Remotion's headless browser needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates ffmpeg fontconfig fonts-noto-core fonts-noto-color-emoji \
        libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 \
        libgbm1 libnss3 libpango-1.0-0 libxcomposite1 libxdamage1 libxfixes3 \
        libxkbcommon0 libxrandr2 \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

# Node.js from the official image, uv from its official image.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
COPY --from=uv /uv /uvx /usr/local/bin/

WORKDIR /app

# Python: the version comes from .python-version, packages from uv.lock.
# Download caches (uv, npm, sounds) live in BuildKit cache mounts, not in the image:
# smaller image, and rebuilds reuse the downloads.
COPY pyproject.toml uv.lock .python-version README.md ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project

# Default models, baked in so the first run works offline. Must match
# stagorix/models.py (checked by tests/test_models.py).
RUN python -c "from huggingface_hub import snapshot_download; \
snapshot_download('Systran/faster-whisper-small', revision='536b0662742c02347bc0e980a01041f333bce120', local_dir='/opt/models/whisper/small'); \
from huggingface_hub import hf_hub_download; \
hf_hub_download('opencv/face_detection_yunet', 'face_detection_yunet_2023mar.onnx', local_dir='/opt/models/yunet'); \
hf_hub_download('onnx-community/mediapipe_selfie_segmentation', 'onnx/model.onnx', revision='be49485c8e027524be38591817fc5cd31bd9d00e', local_dir='/opt/models/selfie')"
RUN python -c "import hashlib, os, urllib.request; \
os.makedirs('/opt/models/u2net', exist_ok=True); p = '/opt/models/u2net/u2net_human_seg.onnx'; \
urllib.request.urlretrieve('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx', p); \
assert hashlib.sha256(open(p, 'rb').read()).hexdigest() == \
'01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c', 'u2net checksum mismatch'"

# Render: exact packages from package-lock.json plus Remotion's pinned browser.
COPY render/package.json render/package-lock.json render/
RUN --mount=type=cache,target=/root/.npm cd render && npm ci --no-audit --no-fund && npx remotion browser ensure

COPY stagorix stagorix
COPY render render
COPY examples examples
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

# Sound library: synthesized sounds plus CC0 packs, each file checked against its sha256.
RUN --mount=type=cache,target=/root/.cache/stagorix/sounds stagorix sounds build

CMD ["stagorix", "doctor"]
