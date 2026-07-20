from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreateRawDivisionMappingInternalRequest:
    """Exact request accepted by config-service's create route."""

    rawDivisionName: str
    divisionId: int | None
    format: str | None
    gender: str | None
    leagueCode: str
    season: str


@dataclass
class RawDivisionMappingInternalResponse:
    """Complete raw-division representation owned by config-service."""

    rawDivisionName: str
    leagueCode: str
    season: str
    id: int | None = None
    divisionId: int | None = None
    format: str | None = None
    gender: str | None = None
    createdAt: datetime | None = None
    lastUpdate: datetime | None = None
    mapped: bool | None = None

    def is_mapped(self) -> bool:
        return (
            self.divisionId is not None
            and self.format is not None
            and self.gender is not None
        )
