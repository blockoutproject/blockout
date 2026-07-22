"""Domain-shaped facade over generated Blockout API clients."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

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

from scraper.domain.models import (
    AssociationStats,
    CompetitionAssociation,
    Match,
    Pool,
    RawDivisionMapping,
    Team,
)
from scraper.infrastructure.blockout import (
    competitions,
    configuration,
    matches,
    pools,
    teams,
)


class BlockoutClients:
    """Implement the application port with generated service clients."""

    def __init__(
        self,
        config_api: RawDivisionMappingApi,
        status_api: ScraperStatusApi,
        team_api: TeamApi,
        pool_api: PoolApi,
        competition_api: CompetitionAssociationApi,
        match_api: MatchApi,
    ) -> None:
        self._config_api = config_api
        self._status_api = status_api
        self._team_api = team_api
        self._pool_api = pool_api
        self._competition_api = competition_api
        self._match_api = match_api

    async def scraper_enabled(self, name: str) -> bool:
        """Return the owner-controlled enabled flag for this scraper."""
        status = await configuration.get_scraper_status(
            self._status_api, ScraperNameEnum(name)
        )
        return status.enabled

    async def get_raw_division_mappings(
        self, league_code: str, season: str
    ) -> list[RawDivisionMapping]:
        """Return provider mappings for one league and season."""
        return await configuration.get_raw_division_mappings_by_league_and_season(
            self._config_api, league_code, season
        )

    async def create_raw_division_mapping(
        self, mapping: RawDivisionMapping
    ) -> RawDivisionMapping:
        """Create one provider Division mapping."""
        return await configuration.create_raw_division_mapping(
            self._config_api, mapping
        )

    async def get_teams(
        self,
        division_id: int | None = None,
        format: str | None = None,
        gender: str | None = None,
        season: str | None = None,
        club_id: str | None = None,
        ids: list[int] | None = None,
    ) -> list[Team]:
        """Return owner Teams matching the supplied filters."""
        return await teams.get_teams(
            self._team_api,
            division_id,
            format,
            gender,
            season,
            club_id,
            ids,
        )

    async def create_team(self, team: Team) -> Team:
        """Create one owner Team."""
        return await teams.create_team(self._team_api, team)

    async def update_team(self, team: Team, changes: list[str] | None = None) -> Team:
        """Update one owner Team."""
        return await teams.update_team(self._team_api, team, changes)

    async def get_pools(self, league_code: str, season: str) -> list[Pool]:
        """Return owner Pools for one league and season."""
        return await pools.get_pools_by_league_and_season(
            self._pool_api, league_code, season
        )

    async def create_pool(self, pool: Pool) -> Pool:
        """Create one owner Pool."""
        return await pools.create_pool(self._pool_api, pool)

    async def update_pool(self, pool: Pool, changes: list[str] | None = None) -> Pool:
        """Update one owner Pool."""
        return await pools.update_pool(self._pool_api, pool, changes)

    async def get_active_team_associations(
        self, pool_id: int
    ) -> list[CompetitionAssociation]:
        """Return active Pool-Team associations."""
        return await competitions.get_active_team_associations_by_pool(
            self._competition_api, pool_id
        )

    async def add_team_to_pool(
        self, pool_id: int, team_id: int, club_id: str
    ) -> CompetitionAssociation:
        """Create one Pool-Team association."""
        return await competitions.add_team_to_pool(
            self._competition_api, pool_id, team_id, club_id
        )

    async def bulk_deactivate_teams(
        self, pool_id: int, missing_team_ids: set[int]
    ) -> None:
        """Deactivate Teams absent from one complete Pool snapshot."""
        await competitions.bulk_deactivate_teams_by_pool(
            self._competition_api, pool_id, missing_team_ids
        )

    async def bulk_deactivate_pools(self, missing_pool_ids: set[int]) -> None:
        """Deactivate Pools absent from one complete provider snapshot."""
        await competitions.bulk_deactivate_pools(
            self._competition_api, missing_pool_ids
        )

    async def update_association_stats(
        self, pool_id: int, team_id: int, stats: AssociationStats
    ) -> CompetitionAssociation:
        """Replace the ranking statistics for one Pool-Team association."""
        return await competitions.update_team_association_stats(
            self._competition_api, pool_id, team_id, stats
        )

    async def get_matches(self, pool_id: int) -> list[Match]:
        """Return owner Matches for one Pool."""
        return await matches.get_matches_by_pool(self._match_api, pool_id)

    async def create_match(self, match: Match) -> Match:
        """Create one owner Match."""
        return await matches.create_match(self._match_api, match)

    async def update_match(
        self, match: Match, changes: list[str] | None = None
    ) -> Match:
        """Update one owner Match."""
        return await matches.update_match(self._match_api, match, changes)

    async def bulk_deactivate_matches(
        self, pool_id: int, missing_match_codes: set[str]
    ) -> None:
        """Deactivate Matches absent from one complete Pool snapshot."""
        await matches.bulk_deactivate_matches(
            self._match_api, pool_id, missing_match_codes
        )


@asynccontextmanager
async def open_blockout_clients() -> AsyncIterator[BlockoutClients]:
    """Open every generated service client required by one scraper run."""
    async with (
        configuration.build_config_api_client() as config_client,
        teams.build_team_api_client() as team_client,
        pools.build_pool_api_client() as pool_client,
        competitions.build_competition_api_client() as competition_client,
        matches.build_match_api_client() as match_client,
    ):
        yield BlockoutClients(
            RawDivisionMappingApi(config_client),
            ScraperStatusApi(config_client),
            TeamApi(team_client),
            PoolApi(pool_client),
            CompetitionAssociationApi(competition_client),
            MatchApi(match_client),
        )
