from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class Match:
    match_code: str
    league_code: str
    pool_id: int
    team_id_a: int
    team_id_b: int
    match_date: datetime
    status: str
    season: str
    id: Optional[int] = None
    set: Optional[str] = None
    score: Optional[str] = None
    venue: Optional[str] = None
    first_referee: Optional[str] = None
    second_referee: Optional[str] = None
    live_code: Optional[int] = None
    active: bool = True
    created_at: Optional[datetime] = None
    last_update: Optional[datetime] = None