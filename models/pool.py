from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class Pool:
    pool_code: str
    league_code: str
    season: int
    division_code: str
    league_name: str
    name: str
    format: str
    gender: str
    active: bool = True
    last_update: Optional[datetime] = None
    id: Optional[int] = None
