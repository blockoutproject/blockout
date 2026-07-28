FROM python:3.14.6-alpine AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.32 /uv /uvx /bin/

WORKDIR /workspace

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY pyproject.toml uv.lock .python-version ./
COPY apps/backend/club-scraper/pyproject.toml apps/backend/club-scraper/pyproject.toml
COPY apps/backend/competition-scraper/pyproject.toml apps/backend/competition-scraper/pyproject.toml
COPY libs/shared/python-contract-clients libs/shared/python-contract-clients

RUN uv sync --locked --package blockout-competition-scraper --no-dev --no-editable

FROM python:3.14.6-alpine

WORKDIR /app

ENV TZ=UTC \
    PATH="/app/.venv/bin:$PATH"

COPY --from=builder /workspace/.venv /app/.venv
COPY apps/backend/competition-scraper/main.py ./main.py
COPY apps/backend/competition-scraper/scraper ./scraper

CMD ["python", "main.py"]
