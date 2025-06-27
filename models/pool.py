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
    followers_count: Optional[int] = 0
    active: bool = True
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    last_update: Optional[datetime] = None
