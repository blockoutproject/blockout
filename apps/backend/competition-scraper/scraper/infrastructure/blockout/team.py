from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreateTeamInternalRequest:
    """Exact request accepted by teams-service's create route."""

    clubId: str
    rawName: str
    name: str
    shortName: str
    leagueCode: str
    divisionId: int
    season: str
    format: str | None
    gender: str | None
    followersCount: int | None
    logoUrl: str | None
    active: bool


@dataclass(frozen=True)
class UpdateTeamInternalRequest:
    """Exact request accepted by teams-service's update route."""

    clubId: str
    rawName: str
    name: str
    shortName: str
    leagueCode: str
    divisionId: int
    logoUrl: str | None
    season: str
    format: str | None
    gender: str | None
    active: bool


@dataclass
class TeamInternalResponse:
    """Complete teams-service representation used by scraper decisions."""

    clubId: str
    rawName: str
    name: str
    shortName: str
    leagueCode: str
    divisionId: int
    season: str
    gender: str | None = None
    format: str | None = None
    id: int | None = None
    followersCount: int | None = 0
    logoUrl: str | None = None
    active: bool = True
    createdAt: datetime | None = None
    lastUpdate: datetime | None = None
