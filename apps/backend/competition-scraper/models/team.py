from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class Team:
    clubId: str
    rawName: str
    name: str
    shortName: str
    leagueCode: str
    divisionId: str
    season: str
    gender: Optional[str] = None
    format: Optional[str] = None
    id: Optional[int] = None
    followersCount: Optional[int] = 0
    active: bool = True
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None