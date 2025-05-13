from dataclasses import dataclass

@dataclass
class AssociationStats:
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
    points_penalty: int = 0

    def add(
        self, 
        wins: int, 
        losses: int, 
        points: int,
        wins_3_to_0: int,
        wins_3_to_1: int,
        wins_3_to_2: int,
        losses_0_to_3: int,
        losses_1_to_3: int,
        losses_2_to_3: int,
        won_sets: int,
        lost_sets: int,
        won_points: int,
        lost_points: int,
        points_penalty: int
    ):
        """
        Ajoute une nouvelle ligne de statistiques (pour un match) 
        aux statistiques cumulées.
        """
        self.played += 1
        self.wins += wins
        self.losses += losses
        self.points += points
        self.wins_3_to_0 += wins_3_to_0
        self.wins_3_to_1 += wins_3_to_1
        self.wins_3_to_2 += wins_3_to_2
        self.losses_0_to_3 += losses_0_to_3
        self.losses_1_to_3 += losses_1_to_3
        self.losses_2_to_3 += losses_2_to_3
        self.won_sets += won_sets
        self.lost_sets += lost_sets
        self.won_points += won_points
        self.lost_points += lost_points
        self.points_penalty += points_penalty