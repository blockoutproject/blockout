from dataclasses import dataclass

@dataclass
class AssociationStats:
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
    points_penalty: int = 0

    def add(
        self, 
        wins: int, 
        losses: int, 
        points: int,
        wins_three_to_zero: int,
        wins_three_to_one: int,
        wins_three_to_two: int,
        losses_zero_to_three: int,
        losses_one_to_three: int,
        losses_two_to_three: int,
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
        self.wins_three_to_zero += wins_three_to_zero
        self.wins_three_to_one += wins_three_to_one
        self.wins_three_to_two += wins_three_to_two
        self.losses_zero_to_three += losses_zero_to_three
        self.losses_one_to_three += losses_one_to_three
        self.losses_two_to_three += losses_two_to_three
        self.won_sets += won_sets
        self.lost_sets += lost_sets
        self.won_points += won_points
        self.lost_points += lost_points
        self.points_penalty += points_penalty