from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class RawDivisionMapping:
    rawDivisionName: str
    leagueCode: str
    season: str
    id: Optional[int] = None
    divisionId: Optional[str] = None
    format: Optional[str] = None
    gender: Optional[str] = None
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None

    def is_mapped(self) -> bool:
        return self.divisionId is not None and self.format is not None and self.gender is not None