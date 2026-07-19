from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class Team:
    clubId: str
    name: str
    shortName: str
    leagueCode: str
    divisionId: str
    id: Optional[int] = None
    gender: Optional[str] = None
    format: Optional[str] = None
    active: bool = True
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None