from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Optional
from models.format import Format
from models.gender import Gender

@dataclass
class Team:
    club_id: str
    team_name: str
    league_code: str
    division_name: str
    gender: Optional[Gender] = None
    format: Optional[Format] = None
    last_update: Optional[datetime] = None
    id: Optional[int] = None
    active: bool = True