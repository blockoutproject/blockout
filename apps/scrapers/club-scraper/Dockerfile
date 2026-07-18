FROM ghcr.io/astral-sh/uv:0.11.29 AS uv

FROM python:3.12-alpine AS workspace-builder

COPY --from=uv /uv /uvx /bin/

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

COPY --from=workspace-builder /workspace/.venv /workspace/.venv

RUN python -c "import blockout_contract_clients.shared, blockout_contract_clients.config_service, blockout_contract_clients.clubs_service, blockout_contract_clients.teams_service, blockout_contract_clients.competition_service"

COPY apps/scrapers/club-scraper/ .

CMD ["python", "main.py"]
