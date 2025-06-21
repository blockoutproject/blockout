from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class RawDivisionMapping:
    raw_division_name: str
    league_code: str
    season: int
    id: Optional[int] = None
    division_code: Optional[str] = None
    format: Optional[str] = None
    gender: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: Optional[datetime] = None

    def is_mapped(self) -> bool:
        return self.division_code is not None and self.format is not None and self.gender is not None