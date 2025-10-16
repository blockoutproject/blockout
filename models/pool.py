from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class Pool:
    pool_code: str
    league_code: str
    season: str
    division_id: str
    league_name: str
    raw_name: str
    name: str
    short_name: str
    format: str
    gender: str
    followers_count: Optional[int] = 0
    active: bool = True
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    last_update: Optional[datetime] = None
