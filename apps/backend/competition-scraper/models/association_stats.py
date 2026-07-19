from dataclasses import dataclass

@dataclass
class AssociationStats:
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
    coefSets: float = 0.0
    coefPoints: float = 0.0
    pointsPenalty: int = 0

    def add(
        self,
        played: int,
        wins: int,
        losses: int,
        points: int,
        winsThreeToZero: int,
        winsThreeToOne: int,
        winsThreeToTwo: int,
        lossesZeroToThree: int,
        lossesOneToThree: int,
        lossesTwoToThree: int,
        wonSets: int,
        lostSets: int,
        wonPoints: int,
        lostPoints: int,
        pointsPenalty: int,
    ):
        """
        Ajoute une nouvelle ligne de statistiques (pour un match)
        aux statistiques cumulées.
        """
        self.played += played
        self.wins += wins
        self.losses += losses
        self.points += points
        self.winsThreeToZero += winsThreeToZero
        self.winsThreeToOne += winsThreeToOne
        self.winsThreeToTwo += winsThreeToTwo
        self.lossesZeroToThree += lossesZeroToThree
        self.lossesOneToThree += lossesOneToThree
        self.lossesTwoToThree += lossesTwoToThree
        self.wonSets += wonSets
        self.lostSets += lostSets
        self.wonPoints += wonPoints
        self.lostPoints += lostPoints
        self.pointsPenalty += pointsPenalty