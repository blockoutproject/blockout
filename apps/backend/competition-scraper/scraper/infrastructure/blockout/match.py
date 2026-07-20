from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreateMatchInternalRequest:
    """Exact request accepted by matches-service's create route."""

    matchCode: str
    leagueCode: str
    poolId: int
    liveCode: int | None
    teamIdA: int
    teamIdB: int
    matchDate: datetime
    season: str
    set: str | None
    score: str | None
    venue: str | None
    firstReferee: str | None
    secondReferee: str | None
    active: bool


@dataclass(frozen=True)
class UpdateMatchInternalRequest:
    """Exact request accepted by matches-service's update route."""

    matchCode: str
    leagueCode: str
    poolId: int
    liveCode: int | None
    teamIdA: int
    teamIdB: int
    matchDate: datetime
    season: str
    set: str | None
    score: str | None
    venue: str | None
    firstReferee: str | None
    secondReferee: str | None


@dataclass(frozen=True)
class BulkMatchesDeactivateInternalRequest:
    """Exact request accepted by matches-service's bulk cleanup route."""

    missingMatchCodes: list[str]


@dataclass
class MatchInternalResponse:
    """Complete matches-service representation used by scraper decisions."""

    matchCode: str
    leagueCode: str
    poolId: int
    teamIdA: int
    teamIdB: int
    matchDate: datetime
    season: str
    status: str | None = None
    id: int | None = None
    set: str | None = None
    score: str | None = None
    venue: str | None = None
    firstReferee: str | None = None
    secondReferee: str | None = None
    liveCode: int | None = None
    active: bool = True
    createdAt: datetime | None = None
    lastUpdate: datetime | None = None
    liveUrl: str | None = None
    liveProvider: str | None = None
    liveOwnerAuth0Id: str | None = None
