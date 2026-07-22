"""Competition scraper process bootstrap."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import httpx
from prometheus_client import Gauge, start_http_server

from scraper.application.ports import BlockoutPort, ProviderHttpPort
from scraper.config.settings import LOG_LEVEL, SCRAPER_TYPES
from scraper.infrastructure.blockout.auth import refresh_token_task
from scraper.infrastructure.blockout.clients import open_blockout_clients
from scraper.infrastructure.provider_http import ProviderHttpClient
from scraper.infrastructure.scheduling.scheduler import schedule_scraper
from scraper.infrastructure.sources import create_scraper
from scraper.observability.logging import configure_logging, log_event

lock = asyncio.Lock()

execution_duration_gauge = Gauge(
    "scraper_execution_duration_seconds",
    "Duration of the scraper execution in seconds",
)


async def _run_one_scraper(
    provider_http: ProviderHttpPort,
    blockout: BlockoutPort,
    scraper_type: str,
) -> None:
    await create_scraper(scraper_type, provider_http, blockout).scrape()


async def run_scrapers_with_max_concurrency(
    provider_http: ProviderHttpPort,
    blockout: BlockoutPort,
    scraper_types: list[str],
    max_concurrency: int = 2,
) -> None:
    """Run configured sources with a small shared concurrency bound."""
    semaphore = asyncio.Semaphore(max_concurrency)

    async def run(scraper_type: str) -> None:
        async with semaphore:
            await _run_one_scraper(provider_http, blockout, scraper_type)

    await asyncio.gather(*(run(scraper_type) for scraper_type in scraper_types))


async def main() -> bool:
    """Run one scheduled competition ingestion cycle."""
    start_time = datetime.now(UTC)
    skipped = False

    try:
        async with open_blockout_clients() as blockout:
            try:
                if not await blockout.scraper_enabled("SCRAPER"):
                    log_event(
                        action="scraper_skipped",
                        level="warning",
                        message="Scraper 'SCRAPER' désactivé via API config.",
                    )
                    skipped = True
            except Exception as error:
                log_event(
                    action="scraper_status_fetch_failed",
                    level="error",
                    message="Impossible de récupérer le statut du scraper 'SCRAPER'.",
                    error_type=type(error).__name__,
                )
                skipped = True

        if not skipped:
            async with lock:
                async with (
                    httpx.AsyncClient(
                        timeout=10,
                        trust_env=True,
                        follow_redirects=True,
                        limits=httpx.Limits(max_connections=20),
                    ) as provider_client,
                    open_blockout_clients() as blockout,
                ):
                    provider_http = ProviderHttpClient(
                        provider_client, max_concurrency=10
                    )
                    await run_scrapers_with_max_concurrency(
                        provider_http=provider_http,
                        blockout=blockout,
                        scraper_types=SCRAPER_TYPES,
                    )

    except Exception as error:
        log_event(
            action="scraping_error",
            level="error",
            message="Erreur lors du scraping",
            error_type=type(error).__name__,
        )
    finally:
        execution_duration_gauge.set((datetime.now(UTC) - start_time).total_seconds())

    return not skipped


async def app() -> None:
    """Start metrics, token refresh and the scheduled scraper loop."""
    configure_logging(LOG_LEVEL)
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
