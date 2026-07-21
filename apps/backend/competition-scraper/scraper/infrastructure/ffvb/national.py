"""National FFVB competition source."""

import aiohttp
import httpx

from scraper.application.ffvb_league_ingestion import ingest_league_pools
from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.discovery import parse_national_pools
from scraper.observability.logging import log_event


class NationalScraper(Scraper):
    """Discover and ingest national FFVB pools."""

    def __init__(
        self, session: aiohttp.ClientSession, provider_client: httpx.AsyncClient
    ) -> None:
        super().__init__(
            session,
            provider_client,
            name="national_scraper",
            url="https://www.ffvb.org/119-37-1-Championnats-Nationaux",
            priority_validation_enabled=False,
        )
        self.leagueCode = "ABCCS"
        self.leagueName = "Nationale"

    async def run_scraping(self) -> None:
        """Parse the national index and ingest every mapped pool."""
        try:
            sources = parse_national_pools(await self.fetch(self.url))
            if sources:
                await ingest_league_pools(
                    self, self.leagueCode, self.leagueName, sources
                )
            await self.finalize_matches_updates()
            await self.finalize_associations_updates()
        except Exception as error:
            log_event(
                action="critical_error",
                level="error",
                leagueName=self.leagueName,
                error=repr(error),
                message="Erreur critique lors du scraping des poules nationales.",
            )
