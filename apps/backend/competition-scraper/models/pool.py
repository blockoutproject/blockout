from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class Pool:
    poolCode: str
    leagueCode: str
    season: str
    divisionId: str
    leagueName: str
    rawName: str
    name: str
    shortName: str
    format: str
    gender: str
    followersCount: Optional[int] = 0
    active: bool = True
    id: Optional[int] = None
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None
