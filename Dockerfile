# One image, two bases: CPU (default) and NVIDIA GPU (compose.gpu.yaml).
# Base tags are pinned here; digests get pinned once CI can resolve them (roadmap 2.6).

ARG BASE_IMAGE=debian:bookworm-slim
ARG NODE_IMAGE=node:22-bookworm-slim
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.11.32

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
COPY pyproject.toml uv.lock .python-version README.md ./
RUN uv sync --frozen --no-dev --no-install-project

# Render: exact packages from package-lock.json plus Remotion's pinned browser.
COPY render/package.json render/package-lock.json render/
RUN cd render && npm ci --no-audit --no-fund && npx remotion browser ensure

COPY stagorix stagorix
COPY render render
RUN uv sync --frozen --no-dev

CMD ["stagorix", "doctor"]
