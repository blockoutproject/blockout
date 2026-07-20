from collections.abc import Iterable
from typing import Protocol

from club_scraper.infrastructure.blockout.contracts import ClubInternalResponse


class BlockoutPort(Protocol):
    """Internal operations required by club ingestion."""

    async def get_all_clubs(self) -> list[ClubInternalResponse]: ...

    async def get_unique_club_ids(self) -> list[str]: ...

    async def create_club(self, club: ClubInternalResponse) -> ClubInternalResponse: ...

    async def update_club(self, club: ClubInternalResponse) -> ClubInternalResponse: ...

    async def bulk_deactivate_clubs(self, identifiers: Iterable[str]) -> None: ...


class FfvbPort(Protocol):
    """FFVB operation required by club ingestion."""

    async def fetch_club_page(self, identifier: str) -> str: ...
