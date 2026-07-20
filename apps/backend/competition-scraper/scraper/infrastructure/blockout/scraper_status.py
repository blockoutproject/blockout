from dataclasses import dataclass
from datetime import datetime


@dataclass
class ScraperStatusInternalResponse:
    """Complete scraper status representation owned by config-service."""

    id: int
    name: str
    enabled: bool
    lastUpdate: datetime
