from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from models.enums.division_code import DivisionCode
from models.enums.format import Format
from models.enums.gender import Gender

@dataclass
class Pool:
    pool_code: str
    league_code: str
    season: int
    division_code: DivisionCode
    division_name: str
    league_name: str
    name: str
    format: Format
    gender: Gender
    active: bool = True
    last_update: Optional[datetime] = None
    id: Optional[int] = None
