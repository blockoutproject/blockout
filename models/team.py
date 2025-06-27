from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class Team:
    club_id: str
    name: str
    short_name: str
    league_code: str
    division_code: str
    id: Optional[int] = None
    gender: Optional[str] = None
    format: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None
    last_update: Optional[datetime] = None