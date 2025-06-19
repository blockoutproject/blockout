from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from models.enums.division_code import DivisionCode
from models.enums.format import Format
from models.enums.gender import Gender

@dataclass
class RawDivisionMapping:
    raw_division_name: str
    league_code: str
    season: int
    id: Optional[int] = None
    division_code: Optional[DivisionCode] = None
    format: Optional[Format] = None
    gender: Optional[Gender] = None
    created_at: datetime = datetime.now()
    updated_at: Optional[datetime] = None

    def is_mapped(self) -> bool:
        return self.division_code is not None and self.format is not None and self.gender is not None