from __future__ import annotations

import aiohttp
import asyncio
from datetime import UTC, datetime
from prometheus_client import start_http_server
from scraper.application.club_ingestion import ClubIngestion
from scraper.infrastructure.blockout.clients import BlockoutClients
from scraper.infrastructure.ffvb.client import FfvbClubClient
from scraper.observability.metrics import (
    club_scraping_duration,
    execution_duration,
)

from scraper.config.settings import Settings, load_settings
from scraper.infrastructure.blockout.auth import (
    Auth0TokenRefresher,
    TokenStore,
    token_store,
)
from scraper.infrastructure.scheduling.scheduler import run_hourly
from scraper.observability.logging import configure_logging, log_event

SCRAPER_NAME = "SCRAPER_CLUBS"


class ClubScraperRuntime:
    """Own process-level sessions, gating, locking, and run measurement."""

    def __init__(self, settings: Settings, tokens: TokenStore = token_store) -> None:
        self.settings = settings
        self.tokens = tokens
        self._lock = asyncio.Lock()

    async def scraper_enabled(self) -> bool:
        """Fail closed when config-service is unavailable or disables ingestion."""
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(
                timeout=timeout, trust_env=True
            ) as session:
                status = await BlockoutClients(
                    session, self.settings, self.tokens
                ).get_scraper_status(SCRAPER_NAME)
            if not status.enabled:
                log_event(
                    action="scraper_skipped",
                    level="warning",
                    message=f"Scraper '{SCRAPER_NAME}' désactivé via API config.",
                )
                return False
            return True
        except Exception as error:
            log_event(
                action="scraper_status_fetch_failed",
                level="error",
                message=f"Impossible de récupérer le statut du scraper '{SCRAPER_NAME}'.",
                error=str(error),
            )
            return False

    async def run_scraper(self) -> None:
        """Run one ingestion while holding the process lock."""
        async with self._lock:
            connector = aiohttp.TCPConnector(limit=20, ssl=False)
            timeout = aiohttp.ClientTimeout(total=60)
            async with aiohttp.ClientSession(
                timeout=timeout,
                trust_env=True,
                connector=connector,
            ) as session:
                ingestion = ClubIngestion(
                    BlockoutClients(session, self.settings, self.tokens),
                    FfvbClubClient(session),
                    club_scraping_duration,
                )
                await ingestion.run()

    async def execute(self) -> None:
        """Measure every scheduled attempt, including disabled and failed runs."""
        started_at = datetime.now(UTC)
        try:
            if await self.scraper_enabled():
                await self.run_scraper()
        except Exception as error:
            log_event(
                action="scraping_error",
                level="error",
                message="Erreur lors du scraping",
                error=str(error),
            )
        finally:
            duration = (datetime.now(UTC) - started_at).total_seconds()
            execution_duration.set(duration)


def start() -> None:
    """Compose dependencies and start metrics, token refresh, and scheduling."""
    settings = load_settings()
    configure_logging(settings.log_level)
    runtime = ClubScraperRuntime(settings)
    refresher = Auth0TokenRefresher(settings, runtime.tokens)
    start_http_server(8001)
    loop = asyncio.get_event_loop()

    try:
        loop.create_task(refresher.run())
        log_event(
            action="refresh_token_task_started",
            level="info",
            message="Tâche de rafraîchissement de token démarrée.",
        )
        run_hourly(runtime.execute)
    except Exception as error:
        log_event(
            action="startup_error",
            level="error",
            message="Erreur lors du démarrage",
            error=str(error),
        )
    finally:
        loop.run_until_complete(asyncio.sleep(0))
