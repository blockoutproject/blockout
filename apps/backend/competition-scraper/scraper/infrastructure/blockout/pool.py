from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreatePoolInternalRequest:
    """Exact request accepted by pools-service's create route."""

    poolCode: str
    leagueCode: str
    season: str
    leagueName: str
    rawName: str
    name: str
    shortName: str
    divisionId: int
    format: str
    gender: str
    followersCount: int | None
    active: bool


@dataclass(frozen=True)
class UpdatePoolInternalRequest:
    """Exact request accepted by pools-service's update route."""

    poolCode: str
    leagueCode: str
    season: str
    leagueName: str
    rawName: str
    name: str
    shortName: str
    divisionId: int
    format: str
    gender: str
    active: bool


@dataclass
class PoolInternalResponse:
    """Complete pools-service representation used by scraper decisions."""

    poolCode: str
    leagueCode: str
    season: str
    divisionId: int
    leagueName: str
    rawName: str
    name: str
    shortName: str
    format: str
    gender: str
    followersCount: int | None = 0
    active: bool = True
    id: int | None = None
    createdAt: datetime | None = None
    lastUpdate: datetime | None = None
