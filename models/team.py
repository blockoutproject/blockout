from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from models.format import Format
from models.gender import Gender

@dataclass
class Team:
    club_id: str
    pool_id: int
    team_name: str
    league_code: str
    division_name: str
    gender: Optional[Gender] = None
    format: Optional[Format] = None
    last_update: Optional[datetime] = None
    id: Optional[int] = None
    active: bool = True
    
    def to_dict(self) -> dict:
        """
        Convertit l'instance actuelle en un dictionnaire compatible JSON.
        Gère les champs Enum et datetime.
        """
        result = {}
        for key, value in asdict(self).items():
            if isinstance(value, Enum):
                result[key] = value.value  # Convertir Enum en sa valeur
            elif isinstance(value, datetime):
                result[key] = value.isoformat()  # Convertir datetime en format ISO 8601
            else:
                result[key] = value  # Conserver les autres types
        return result