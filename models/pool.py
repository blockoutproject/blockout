from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional
from models.format import Format
from models.gender import Gender

class PoolDivisionCode(Enum):
    REG = "REG"
    NAT = "NAT"
    PRO = "PRO"
    JNR = "JNR"
    OTHER = "OTHER"

@dataclass
class Pool:
    pool_code: str
    league_code: str
    season: int
    division_code: PoolDivisionCode
    last_update: Optional[datetime] = None
    id: Optional[int] = None
    league_name: Optional[str] = None
    name: Optional[str] = None
    division_name: Optional[str] = None
    format: Optional[Format] = Format.SIX
    gender: Optional[Gender] = None
    active: bool = True