from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class CompetitionAssociation:
    """
    Représente l'association entre une Pool et une Team,
    avec gestion du statut 'active' et des statistiques de compétition
    """
    pool_id: int
    team_id: int
    club_id: str
    id: Optional[int] = None
    active: bool = True
    played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0
    wins_3_to_0: int = 0
    wins_3_to_1: int = 0
    wins_3_to_2: int = 0
    losses_0_to_3: int = 0
    losses_1_to_3: int = 0
    losses_2_to_3: int = 0
    won_sets: int = 0
    lost_sets: int = 0
    won_points: int = 0
    lost_points: int = 0
    points_penalty: int = 0
    coef_sets: float = 0.0
    coef_points: float = 0.0
    last_update: Optional[datetime] = None
    
    