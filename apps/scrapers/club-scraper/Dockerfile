FROM python:3.12-alpine AS contracts-wheel

WORKDIR /contracts

COPY openapitools.json package-lock.json ./generation-inputs/
COPY libs/shared/contracts/generated/specs/ ./generation-inputs/specs/
COPY libs/shared/contracts/clients/python/config/ ./generation-inputs/config/
COPY libs/shared/contracts/clients/python/pyproject.toml libs/shared/contracts/clients/python/README.md ./
COPY libs/shared/contracts/clients/python/src/ ./src/

RUN python -m pip wheel --no-cache-dir --no-deps --wheel-dir /wheel .

FROM python:3.12-alpine

# Keep the existing scraper work directory and entry point.
WORKDIR /app

ENV TZ=UTC

COPY apps/scrapers/club-scraper/requirements.txt .
COPY --from=contracts-wheel /wheel/*.whl /tmp/wheels/

RUN pip install --no-cache-dir -r requirements.txt /tmp/wheels/*.whl \
    && python -c "import blockout_contract_clients.config_service, blockout_contract_clients.clubs_service, blockout_contract_clients.teams_service, blockout_contract_clients.competition_service"

COPY apps/scrapers/club-scraper/ .

CMD ["python", "main.py"]
