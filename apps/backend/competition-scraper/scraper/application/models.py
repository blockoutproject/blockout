"""Application models shared across competition ingestion workflows."""

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class RawDivisionMapping:
    """Provider Division name and its optional Blockout classification."""

    raw_division_name: str
    league_code: str
    season: str
    id: int | None = None
    division_id: int | None = None
    format: str | None = None
    gender: str | None = None
    created_at: datetime | None = None
    last_update: datetime | None = None
    mapped: bool | None = None

    def is_mapped(self) -> bool:
        """Return whether every classification component is present."""
        return (
            self.division_id is not None
            and self.format is not None
            and self.gender is not None
        )


@dataclass(slots=True)
class Team:
    """Team state used by competition ingestion independently of HTTP transport."""

    club_id: str
    raw_name: str
    name: str
    short_name: str
    league_code: str
    division_id: int
    season: str
    gender: str | None = None
    format: str | None = None
    id: int | None = None
    followers_count: int | None = 0
    logo_url: str | None = None
    active: bool = True
    created_at: datetime | None = None
    last_update: datetime | None = None
