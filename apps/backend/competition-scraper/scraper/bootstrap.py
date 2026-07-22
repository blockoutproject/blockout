from __future__ import annotations

import asyncio
from contextvars import ContextVar
from datetime import UTC, datetime

import aiohttp
import httpx
from blockout_contract_clients.competition.api.competition_association_api import (
    CompetitionAssociationApi,
)
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.config.api.scraper_status_api import ScraperStatusApi
from blockout_contract_clients.config.models.scraper_name_enum import ScraperNameEnum
from blockout_contract_clients.match.api.match_api import MatchApi
from blockout_contract_clients.pool.api.pool_api import PoolApi
from blockout_contract_clients.team.api.team_api import TeamApi
from prometheus_client import Gauge, start_http_server

from scraper.application.factory import ScraperFactory
from scraper.config.settings import SCRAPER_TYPES
from scraper.infrastructure.blockout.auth import refresh_token_task
from scraper.infrastructure.blockout.competitions import build_competition_api_client
from scraper.infrastructure.blockout.configuration import (
    build_config_api_client,
    get_scraper_status,
)
from scraper.infrastructure.blockout.matches import build_match_api_client
from scraper.infrastructure.blockout.pools import build_pool_api_client
from scraper.infrastructure.blockout.teams import build_team_api_client
from scraper.infrastructure.scheduling.scheduler import schedule_scraper
from scraper.observability.logging import log_event

current_scraper = ContextVar("current_scraper", default="global_scraper")

lock = asyncio.Lock()

execution_duration_gauge = Gauge(
    "scraper_execution_duration_seconds",
    "Duration of the scraper execution in seconds",
)


async def _run_one_scraper(
    session: aiohttp.ClientSession,
    provider_client: httpx.AsyncClient,
    scraper_type: str,
    raw_division_mapping_api: RawDivisionMappingApi | None = None,
    team_api: TeamApi | None = None,
    pool_api: PoolApi | None = None,
    competition_api: CompetitionAssociationApi | None = None,
    match_api: MatchApi | None = None,
):
    current_scraper.set(scraper_type)
    scraper = ScraperFactory.create_scraper(
        scraper_type,
        session,
        provider_client,
        raw_division_mapping_api,
        team_api,
        pool_api,
        competition_api,
        match_api,
    )
    await scraper.scrape()


async def run_scrapers_with_max_concurrency(
    session: aiohttp.ClientSession,
    provider_client: httpx.AsyncClient,
    scraper_types: list[str],
    raw_division_mapping_api: RawDivisionMappingApi | None = None,
    team_api: TeamApi | None = None,
    pool_api: PoolApi | None = None,
    competition_api: CompetitionAssociationApi | None = None,
    match_api: MatchApi | None = None,
    max_concurrency: int = 2,
):
    pending_types = list(scraper_types)
    running: set[asyncio.Task] = set()

    while pending_types and len(running) < max_concurrency:
        st = pending_types.pop(0)
        running.add(
            asyncio.create_task(
                _run_one_scraper(
                    session,
                    provider_client,
                    st,
                    raw_division_mapping_api,
                    team_api,
                    pool_api,
                    competition_api,
                    match_api,
                )
            )
        )

    while running:
        done, running = await asyncio.wait(running, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            t.result()

        while pending_types and len(running) < max_concurrency:
            st = pending_types.pop(0)
            running.add(
                asyncio.create_task(
                    _run_one_scraper(
                        session,
                        provider_client,
                        st,
                        raw_division_mapping_api,
                        team_api,
                        pool_api,
                        competition_api,
                        match_api,
                    )
                )
            )


async def main() -> bool:
    start_time = datetime.now(UTC)
    skipped = False

    try:
        async with build_config_api_client() as config_api_client:
            try:
                status = await get_scraper_status(
                    ScraperStatusApi(config_api_client), ScraperNameEnum.SCRAPER
                )
                if not status.enabled:
                    log_event(
                        action="scraper_skipped",
                        level="warning",
                        message="Scraper 'SCRAPER' désactivé via API config.",
                    )
                    skipped = True
            except Exception as e:
                log_event(
                    action="scraper_status_fetch_failed",
                    level="error",
                    message="Impossible de récupérer le statut du scraper 'SCRAPER'.",
                    error=str(e),
                )
                skipped = True

        if not skipped:
            async with lock:
                connector = aiohttp.TCPConnector(limit=20)
                timeout = aiohttp.ClientTimeout(total=10)

                async with (
                    aiohttp.ClientSession(
                        timeout=timeout,
                        trust_env=True,
                        connector=connector,
                    ) as session,
                    httpx.AsyncClient(
                        timeout=10,
                        trust_env=True,
                        follow_redirects=True,
                        limits=httpx.Limits(max_connections=20),
                    ) as provider_client,
                    build_config_api_client() as config_api_client,
                    build_team_api_client() as team_api_client,
                    build_pool_api_client() as pool_api_client,
                    build_competition_api_client() as competition_api_client,
                    build_match_api_client() as match_api_client,
                ):
                    scraper_types = SCRAPER_TYPES
                    await run_scrapers_with_max_concurrency(
                        session=session,
                        provider_client=provider_client,
                        raw_division_mapping_api=RawDivisionMappingApi(
                            config_api_client
                        ),
                        team_api=TeamApi(team_api_client),
                        pool_api=PoolApi(pool_api_client),
                        competition_api=CompetitionAssociationApi(
                            competition_api_client
                        ),
                        match_api=MatchApi(match_api_client),
                        scraper_types=scraper_types,
                    )

    except Exception as e:
        log_event(
            action="scraping_error",
            level="error",
            message="Erreur lors du scraping",
            error=str(e),
        )
    finally:
        end_time = datetime.now(UTC)
        execution_duration_gauge.set((end_time - start_time).total_seconds())

    return not skipped


async def app() -> None:
    start_http_server(8000)

    asyncio.create_task(refresh_token_task())
    log_event(
        action="refresh_token_task_started",
        level="info",
        message="Tâche de rafraîchissement de token démarrée.",
    )

    schedule_scraper(scrape_fn=main)
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(app())
