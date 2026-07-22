from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class Club:
    """Mutable Club state used while one ingestion run reconciles providers."""

    id: str
    raw_name: str
    name: str
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    email: str | None = None
    phone_number: str | None = None
    website: str | None = None
    logo_url: str | None = None
    active: bool = True
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime | None = None
    last_update: datetime | None = None
