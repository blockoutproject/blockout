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
    wins_three_to_zero: int = 0
    wins_three_to_one: int = 0
    wins_three_to_two: int = 0
    losses_zero_to_three: int = 0
    losses_one_to_three: int = 0
    losses_two_to_three: int = 0
    won_sets: int = 0
    lost_sets: int = 0
    won_points: int = 0
    lost_points: int = 0
    points_penalty: int = 0
    coef_sets: float = 0.0
    coef_points: float = 0.0   
    created_at: Optional[datetime] = None
    last_update: Optional[datetime] = None 
    