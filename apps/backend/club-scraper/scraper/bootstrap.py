from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import httpx
from prometheus_client import start_http_server

from scraper.application.club_ingestion import ClubIngestion
from scraper.config.settings import Settings, load_settings
from scraper.infrastructure.blockout.auth import (
    Auth0TokenRefresher,
    TokenStore,
    token_store,
)
from scraper.infrastructure.blockout.clients import (
    open_blockout_clients,
)
from scraper.infrastructure.ffvb.client import FfvbClubClient
from scraper.infrastructure.scheduling.scheduler import run_hourly
from scraper.observability.logging import configure_logging, log_event
from scraper.observability.metrics import (
    club_scraping_duration,
    execution_duration,
)

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
            async with open_blockout_clients(self.settings, self.tokens) as blockout:
                enabled = await blockout.scraper_enabled(SCRAPER_NAME)
            if not enabled:
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
            async with (
                open_blockout_clients(self.settings, self.tokens) as blockout,
                httpx.AsyncClient(
                    timeout=60,
                    trust_env=True,
                    verify=False,
                    follow_redirects=True,
                    limits=httpx.Limits(max_connections=20),
                ) as ffvb_client,
            ):
                ingestion = ClubIngestion(
                    blockout,
                    FfvbClubClient(ffvb_client),
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
