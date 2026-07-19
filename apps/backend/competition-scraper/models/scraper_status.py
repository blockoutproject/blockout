from dataclasses import dataclass
from datetime import datetime

@dataclass
class ScraperStatus:
    id: int
    name: str
    enabled: bool
    last_update: datetime
