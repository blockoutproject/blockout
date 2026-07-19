from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class Match:
    matchCode: str
    leagueCode: str
    poolId: int
    teamIdA: int
    teamIdB: int
    matchDate: datetime
    season: str
    status: Optional[str] = None
    id: Optional[int] = None
    set: Optional[str] = None
    score: Optional[str] = None
    venue: Optional[str] = None
    firstReferee: Optional[str] = None
    secondReferee: Optional[str] = None
    liveCode: Optional[int] = None
    active: bool = True
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None
    liveUrl: Optional[str] = None
    liveProvider: Optional[str] = None
    liveOwnerAuth0Id: Optional[str] = None
