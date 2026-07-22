from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any


class ScraperName(StrEnum):
    """Values owned by config-service's scraper status contract."""

    SCRAPER = "SCRAPER"
    SCRAPER_CLUBS = "SCRAPER_CLUBS"


@dataclass(frozen=True, slots=True)
class ScraperStatusInternalResponse:
    """Exact handwritten mirror of config-service's scraper status response."""

    id: int
    name: ScraperName
    enabled: bool
    lastUpdate: datetime

    @classmethod
    def from_json(cls, data: dict[str, Any]) -> ScraperStatusInternalResponse:
        """Decode the camelCase config-service response."""
        return cls(
            id=data.get("id"),
            name=ScraperName(data.get("name")),
            enabled=data.get("enabled"),
            lastUpdate=_datetime(data.get("lastUpdate")),
        )


@dataclass(frozen=True, slots=True)
class BulkDeactivateClubsInternalRequest:
    """Exact handwritten mirror of competition-service's cascade request."""

    missingClubIds: list[str]

    def to_json(self) -> dict[str, list[str]]:
        """Return the native camelCase JSON object."""
        return asdict(self)


def _datetime(value: str | datetime | None) -> datetime | None:
    return datetime.fromisoformat(value) if isinstance(value, str) else value
