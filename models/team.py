from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from models.enums.format import Format
from models.enums.gender import Gender

@dataclass
class Team:
    club_id: str
    name: str
    short_name: str
    league_code: str
    division_name: str
    gender: Optional[Gender] = None
    format: Optional[Format] = None
    last_update: Optional[datetime] = None
    id: Optional[int] = None
    active: bool = True