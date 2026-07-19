FROM python:3.12-alpine AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.29 /uv /bin/uv

WORKDIR /workspace

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

COPY .python-version pyproject.toml uv.lock ./
COPY apps/scrapers/club-scraper/pyproject.toml ./apps/scrapers/club-scraper/pyproject.toml
COPY apps/scrapers/competition-scraper/pyproject.toml ./apps/scrapers/competition-scraper/pyproject.toml
COPY libs/shared/contracts/clients/python/pyproject.toml libs/shared/contracts/clients/python/README.md ./libs/shared/contracts/clients/python/
COPY libs/shared/contracts/clients/python/src/ ./libs/shared/contracts/clients/python/src/

RUN uv sync --locked --package blockout-club-scraper --no-dev --no-editable

FROM python:3.12-alpine

WORKDIR /app

ENV TZ=UTC \
    PATH="/workspace/.venv/bin:$PATH"

COPY --from=builder /workspace/.venv /workspace/.venv

COPY apps/scrapers/club-scraper/ .

CMD ["python", "main.py"]
