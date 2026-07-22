"""Shared lifecycle for competition provider sources."""

from abc import ABC, abstractmethod
from datetime import UTC, datetime

import aiohttp
import httpx
from blockout_contract_clients.competition.api.competition_association_api import (
    CompetitionAssociationApi,
)
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.pool.api.pool_api import PoolApi
from blockout_contract_clients.team.api.team_api import TeamApi
from prometheus_client import Gauge

from scraper.application.association_changes import AssociationChangeSet
from scraper.application.match_changes import MatchChangeSet, MatchEntry
from scraper.application.models import (
    AssociationStats,
)
from scraper.domain.data_source_priority import DataSourcePriority
from scraper.infrastructure.blockout.match import MatchInternalResponse
from scraper.infrastructure.provider_http import ProviderHttpClient
from scraper.observability.logging import current_scraper, log_event


class Scraper(ABC):
    """Coordinate one provider source without owning provider parsing rules."""

    _gauges: dict[str, Gauge] = {}

    def __init__(
        self,
        session: aiohttp.ClientSession,
        provider_client: httpx.AsyncClient,
        name: str,
        raw_division_mapping_api: RawDivisionMappingApi | None = None,
        team_api: TeamApi | None = None,
        pool_api: PoolApi | None = None,
        competition_api: CompetitionAssociationApi | None = None,
        url: str | None = None,
        priority_validation_enabled: bool = False,
        max_concurrency: int = 10,
    ) -> None:
        self.session = session
        self.name = name
        self.raw_division_mapping_api = raw_division_mapping_api
        self.team_api = team_api
        self.pool_api = pool_api
        self.competition_api = competition_api
        self.url = url
        self.priority_validation_enabled = priority_validation_enabled
        self._max_concurrency = max_concurrency
        self._provider_http = ProviderHttpClient(provider_client, max_concurrency)
        self._match_changes = MatchChangeSet(session, priority_validation_enabled)
        self._association_changes = AssociationChangeSet(competition_api)

        # These aliases remain public within the application because provider workflows
        # resolve dependencies from the pending writes before the final flush.
        self._matches_cache: dict[tuple[str, str], MatchEntry] = (
            self._match_changes.entries
        )
        self._associations_cache = self._association_changes.entries

        class_name = type(self).__name__.lower()
        if class_name not in self._gauges:
            self._gauges[class_name] = Gauge(
                f"{class_name}_scraping_duration_seconds",
                f"Scraping duration for {class_name}",
            )
        self.scraping_duration_gauge = self._gauges[class_name]

    def teams_api(self) -> TeamApi:
        """Return the configured generated teams-service client."""
        if self.team_api is None:
            raise RuntimeError("The generated teams-service client is not configured.")
        return self.team_api

    def pools_api(self) -> PoolApi:
        """Return the configured generated pools-service client."""
        if self.pool_api is None:
            raise RuntimeError("The generated pools-service client is not configured.")
        return self.pool_api

    def competitions_api(self) -> CompetitionAssociationApi:
        """Return the configured generated competition-service client."""
        if self.competition_api is None:
            raise RuntimeError(
                "The generated competition-service client is not configured."
            )
        return self.competition_api

    @abstractmethod
    async def run_scraping(self) -> None:
        """Run the provider-specific workflow."""

    async def scrape(self) -> None:
        """Run one source and record its duration."""
        current_scraper.set(self.name)
        started_at = datetime.now(UTC)
        try:
            await self.run_scraping()
        except Exception as error:
            log_event(
                action="scraping_error",
                level="error",
                error=str(error),
                message=f"Erreur dans le scraper {self.name}",
            )
            raise
        finally:
            duration = (datetime.now(UTC) - started_at).total_seconds()
            self.scraping_duration_gauge.set(duration)

    async def fetch(
        self, url: str, retries: int = 3, delay: int = 5, timeout: int = 20
    ) -> str:
        """Fetch and decode one provider document."""
        return await self._provider_http.fetch(url, retries, delay, timeout)

    async def post_provider_form(
        self, url: str, data: dict[str, str], timeout: int = 20
    ) -> httpx.Response:
        """POST one provider form without using the Blockout API session."""
        return await self._provider_http.post_form(url, data, timeout)

    async def init_matches_cache(self, poolId: int) -> None:
        """Load current owner matches for one pool."""
        self._match_changes.entries = self._matches_cache
        await self._match_changes.load(poolId)
        self._matches_cache = self._match_changes.entries

    async def init_associations_cache(self, pool_id: int) -> None:
        """Load current owner associations for one pool."""
        self._association_changes.entries = self._associations_cache
        await self._association_changes.load(pool_id)
        self._associations_cache = self._association_changes.entries

    def schedule_match_changes(
        self,
        updated_match: MatchInternalResponse,
        prefix: str,
        priority: DataSourcePriority,
    ) -> None:
        """Merge one match candidate into the pending owner writes."""
        self._match_changes.entries = self._matches_cache
        self._match_changes.schedule(updated_match, prefix, priority)
        self._matches_cache = self._match_changes.entries

    def schedule_association_update(
        self,
        pool_id: int,
        team_id: int,
        team_stats: AssociationStats,
    ) -> None:
        """Accumulate one match's statistics for a pool-team association."""
        self._association_changes.entries = self._associations_cache
        self._association_changes.accumulate(pool_id, team_id, team_stats)
        self._associations_cache = self._association_changes.entries

    def schedule_association_replace(
        self,
        pool_id: int,
        team_id: int,
        team_stats: AssociationStats,
    ) -> None:
        """Replace association statistics with an authoritative provider row."""
        self._association_changes.entries = self._associations_cache
        self._association_changes.replace(pool_id, team_id, team_stats)
        self._associations_cache = self._association_changes.entries

    async def finalize_associations_updates(self) -> None:
        """Flush pending association changes."""
        self._association_changes.entries = self._associations_cache
        await self._association_changes.flush()
        self._associations_cache = self._association_changes.entries

    async def finalize_matches_updates(self) -> None:
        """Flush pending match changes."""
        self._match_changes.entries = self._matches_cache
        await self._match_changes.flush()
        self._matches_cache = self._match_changes.entries
