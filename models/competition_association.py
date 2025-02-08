from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Optional

@dataclass
class CompetitionAssociation:
    """
    Représente l'association entre une Pool et une Team,
    avec gestion du statut 'active' et des statistiques de compétition :
        - points : total de points
        - played : nombre de matchs joués
        - wins : nombre de victoires
        - losses : nombre de défaites
    """
    id: Optional[int] = None
    pool_id: int = 0
    team_id: int = 0
    active: bool = True
    played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0
    last_update: Optional[datetime] = None
    
    