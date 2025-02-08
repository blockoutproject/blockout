from dataclasses import dataclass

@dataclass
class AssociationStats:
    played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0

    def add(self, wins: int, losses: int, points: int):
        """
        Ajoute une nouvelle ligne de statistiques (pour un match) aux statistiques cumulées.
        """
        self.played += 1
        self.wins += wins
        self.losses += losses
        self.points += points