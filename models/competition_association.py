from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Optional

@dataclass
class CompetitionAssociation:
    """
    Représente l'association entre une Pool et une Team, 
    avec gestion du statut 'active', des points, etc.
    """
    id: Optional[int] = None
    pool_id: int = 0
    team_id: int = 0
    active: bool = True
    points: int = 0
    last_update: Optional[datetime] = None

    def to_dict(self) -> dict:
        """
        Convertit l'instance actuelle en un dictionnaire compatible JSON.
        Gère la conversion des champs datetime au format ISO 8601.
        """
        result = {}
        for key, value in asdict(self).items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result