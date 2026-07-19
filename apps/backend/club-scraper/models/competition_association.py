from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class CompetitionAssociation:
    """
    Représente l'association entre une Pool et une Team,
    avec gestion du statut 'active' et des statistiques de compétition
    """
    poolId: int
    teamId: int
    clubId: str
    id: Optional[int] = None
    active: bool = True
    played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0
    winsThreeToZero: int = 0
    winsThreeToOne: int = 0
    winsThreeToTwo: int = 0
    lossesZeroToThree: int = 0
    lossesOneToThree: int = 0
    lossesTwoToThree: int = 0
    wonSets: int = 0
    lostSets: int = 0
    wonPoints: int = 0
    lostPoints: int = 0
    pointsPenalty: int = 0
    coefSets: float = 0.0
    coefPoints: float = 0.0
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None
