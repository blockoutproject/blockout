"""Outbound ports required by competition ingestion."""

from collections.abc import Mapping
from typing import Protocol

import httpx

from scraper.domain.models import (
    AssociationStats,
    CompetitionAssociation,
    Match,
    Pool,
    RawDivisionMapping,
    Team,
)


class BlockoutPort(Protocol):
    """Domain-shaped operations exposed by Blockout owner services."""

    async def scraper_enabled(self, name: str) -> bool: ...

    async def get_raw_division_mappings(
        self, league_code: str, season: str
    ) -> list[RawDivisionMapping]: ...

    async def create_raw_division_mapping(
        self, mapping: RawDivisionMapping
    ) -> RawDivisionMapping: ...

    async def get_teams(
        self,
        division_id: int | None = None,
        format: str | None = None,
        gender: str | None = None,
        season: str | None = None,
        club_id: str | None = None,
        ids: list[int] | None = None,
    ) -> list[Team]: ...

    async def create_team(self, team: Team) -> Team: ...

    async def update_team(
        self, team: Team, changes: list[str] | None = None
    ) -> Team: ...

    async def get_pools(self, league_code: str, season: str) -> list[Pool]: ...

    async def create_pool(self, pool: Pool) -> Pool: ...

    async def update_pool(
        self, pool: Pool, changes: list[str] | None = None
    ) -> Pool: ...

    async def get_active_team_associations(
        self, pool_id: int
    ) -> list[CompetitionAssociation]: ...

    async def add_team_to_pool(
        self, pool_id: int, team_id: int, club_id: str
    ) -> CompetitionAssociation: ...

    async def bulk_deactivate_teams(
        self, pool_id: int, missing_team_ids: set[int]
    ) -> None: ...

    async def bulk_deactivate_pools(self, missing_pool_ids: set[int]) -> None: ...

    async def update_association_stats(
        self, pool_id: int, team_id: int, stats: AssociationStats
    ) -> CompetitionAssociation: ...

    async def get_matches(self, pool_id: int) -> list[Match]: ...

    async def create_match(self, match: Match) -> Match: ...

    async def update_match(
        self, match: Match, changes: list[str] | None = None
    ) -> Match: ...

    async def bulk_deactivate_matches(
        self, pool_id: int, missing_match_codes: set[str]
    ) -> None: ...


class ProviderHttpPort(Protocol):
    """HTTP operations shared by the external competition providers."""

    async def fetch(
        self, url: str, retries: int = 3, delay: int = 5, timeout: int = 20
    ) -> str: ...

    async def post_form(
        self,
        url: str,
        data: Mapping[str, str],
        timeout: int = 20,
    ) -> httpx.Response: ...
