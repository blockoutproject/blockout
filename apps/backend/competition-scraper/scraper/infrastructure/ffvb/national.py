"""National FFVB competition source."""

import aiohttp
import httpx
from blockout_contract_clients.competition.api.competition_association_api import (
    CompetitionAssociationApi,
)
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.match.api.match_api import MatchApi
from blockout_contract_clients.pool.api.pool_api import PoolApi
from blockout_contract_clients.team.api.team_api import TeamApi

from scraper.application.ffvb_league_ingestion import ingest_league_pools
from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.discovery import parse_national_pools
from scraper.observability.logging import log_event


class NationalScraper(Scraper):
    """Discover and ingest national FFVB pools."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        provider_client: httpx.AsyncClient,
        raw_division_mapping_api: RawDivisionMappingApi | None = None,
        team_api: TeamApi | None = None,
        pool_api: PoolApi | None = None,
        competition_api: CompetitionAssociationApi | None = None,
        match_api: MatchApi | None = None,
    ) -> None:
        super().__init__(
            session,
            provider_client,
            name="national_scraper",
            raw_division_mapping_api=raw_division_mapping_api,
            team_api=team_api,
            pool_api=pool_api,
            competition_api=competition_api,
            match_api=match_api,
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
