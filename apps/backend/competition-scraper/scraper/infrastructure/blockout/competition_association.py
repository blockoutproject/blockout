from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class BulkDeactivatePoolsInternalRequest:
    """Exact request accepted by competition-service's pool cleanup route."""

    missingPoolIds: list[int]


@dataclass(frozen=True)
class BulkDeactivateTeamsInternalRequest:
    """Exact request accepted by competition-service's team cleanup route."""

    missingTeamIds: list[int]


@dataclass
class CompetitionAssociationInternalResponse:
    """Complete competition-service association and ranking representation."""

    poolId: int
    teamId: int
    clubId: str
    id: int | None = None
    active: bool = True
    played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0
    winsThreeToZero: int = 0
    winsThreeToOne: int = 0
    winsThreeToTwo: int = 0
    lossesZeroToThree: int = 0
    lossesOneToThree: int = 0
    lossesTwoToThree: int = 0
    wonSets: int = 0
    lostSets: int = 0
    wonPoints: int = 0
    lostPoints: int = 0
    pointsPenalty: int = 0
    coefSets: float = 0.0
    coefPoints: float = 0.0
    createdAt: datetime | None = None
    lastUpdate: datetime | None = None
