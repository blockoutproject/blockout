from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from models.format import Format
from models.gender import Gender

@dataclass
class RawDivisionMapping:
    id: Optional[int] = None
    raw_division_name: str = 0
    division_name: Optional[str] = None
    format: Optional[Format] = None
    gender: Optional[Gender] = None
    league_code: str = ""
    season: int = 0
    created_at: datetime = datetime.now()
    updated_at: Optional[datetime] = None

    def is_mapped(self) -> bool:
        return self.division_name is not None and self.format is not None and self.gender is not None