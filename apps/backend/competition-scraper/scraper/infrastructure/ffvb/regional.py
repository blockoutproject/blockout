"""Regional FFVB competition source."""

import asyncio

import aiohttp
import httpx
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.team.api.team_api import TeamApi

from scraper.application.ffvb_league_ingestion import ingest_league_pools
from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.discovery import (
    parse_league_pools,
    parse_regional_leagues,
)
from scraper.infrastructure.ffvb.models import FfvbLeagueSource
from scraper.observability.logging import log_event


class RegionalScraper(Scraper):
    """Discover regional leagues and ingest their mapped pools."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        provider_client: httpx.AsyncClient,
        raw_division_mapping_api: RawDivisionMappingApi | None = None,
        team_api: TeamApi | None = None,
    ) -> None:
        super().__init__(
            session,
            provider_client,
            name="regional_scraper",
            raw_division_mapping_api=raw_division_mapping_api,
            team_api=team_api,
            url="https://www.ffvb.org/120-37-1-Championnats-Regionaux",
            priority_validation_enabled=False,
        )

    async def run_scraping(self) -> None:
        """Run the regional source with bounded league concurrency."""
        try:
            leagues = parse_regional_leagues(await self.fetch(self.url))
            semaphore = asyncio.Semaphore(8)

            async def ingest(league: FfvbLeagueSource) -> None:
                async with semaphore:
                    await self.scrape_pools_from_league(
                        leagueCode=league.code,
                        leagueName=league.name,
                        league_page_url=league.url,
                    )

            await asyncio.gather(*(ingest(league) for league in leagues))
            await self.finalize_matches_updates()
            await self.finalize_associations_updates()
        except Exception as error:
            log_event(
                action="critical_error",
                level="error",
                scope="regional_pools",
                error=repr(error),
                message="Erreur critique lors du scraping des poules régionales.",
            )

    async def scrape_pools_from_league(
        self, leagueCode: str, leagueName: str, league_page_url: str
    ) -> None:
        """Parse and ingest one regional league page."""
        try:
            sources = parse_league_pools(await self.fetch(league_page_url))
            if sources:
                await ingest_league_pools(self, leagueCode, leagueName, sources)
        except Exception as error:
            log_event(
                action="critical_league_error",
                level="error",
                leagueCode=leagueCode,
                error=repr(error),
            )
