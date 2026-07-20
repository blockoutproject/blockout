from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any


class ScraperName(StrEnum):
    """Values owned by config-service's scraper status contract."""

    SCRAPER = "SCRAPER"
    SCRAPER_CLUBS = "SCRAPER_CLUBS"


@dataclass(slots=True)
class ClubInternalResponse:
    """Exact handwritten mirror of clubs-service's complete internal response."""

    id: str
    rawName: str
    name: str
    address: str | None = None
    city: str | None = None
    postalCode: str | None = None
    email: str | None = None
    phoneNumber: str | None = None
    website: str | None = None
    logoUrl: str | None = None
    active: bool = True
    latitude: float | None = None
    longitude: float | None = None
    createdAt: datetime | None = None
    lastUpdate: datetime | None = None

    @classmethod
    def from_json(cls, data: dict[str, Any]) -> ClubInternalResponse:
        """Decode the camelCase clubs-service response."""
        return cls(
            id=data.get("id"),
            rawName=data.get("rawName"),
            name=data.get("name"),
            address=data.get("address"),
            city=data.get("city"),
            postalCode=data.get("postalCode"),
            email=data.get("email"),
            phoneNumber=data.get("phoneNumber"),
            website=data.get("website"),
            logoUrl=data.get("logoUrl"),
            active=data.get("active"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            createdAt=_datetime(data.get("createdAt")),
            lastUpdate=_datetime(data.get("lastUpdate")),
        )


@dataclass(frozen=True, slots=True)
class CreateClubInternalRequest:
    """Exact handwritten mirror of clubs-service's create request."""

    id: str
    rawName: str
    name: str
    address: str | None
    city: str | None
    postalCode: str | None
    email: str | None
    phoneNumber: str | None
    website: str | None
    logoUrl: str | None

    def to_json(self) -> dict[str, Any]:
        """Return the native camelCase JSON object."""
        return asdict(self)


@dataclass(frozen=True, slots=True)
class UpdateClubInternalRequest:
    """Exact handwritten mirror of clubs-service's update request."""

    rawName: str
    name: str
    address: str | None
    city: str | None
    postalCode: str | None
    email: str | None
    phoneNumber: str | None
    website: str | None
    logoUrl: str | None

    def to_json(self) -> dict[str, Any]:
        """Return the native camelCase JSON object."""
        return asdict(self)


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
