import re
from typing import Tuple, Optional
from models.pool import Pool
from models.association_stats import AssociationStats

def validate_set_score_format(set_score: str) -> str:
    """
    Valide le score d'un set.
    Renvoie le score s'il est au format attendu, sinon renvoie "0-0".
    """
    pattern = re.compile(r"^\d{1,2}-\d{1,2}$")
    return set_score if set_score and pattern.fullmatch(set_score) else "0-0"

def validate_set_format(set: str) -> str:
    """
    Valide le score d'un set.
    Renvoie le score s'il est au format attendu, sinon renvoie "0-0".
    """
    pattern = re.compile(r"^\d{1}-\d{1}$")
    return set if set and pattern.fullmatch(set) else "0-0"

def is_anomalous_set_format(set_str: str) -> bool:
    """
    Vérifie si le score set contient des lettres, 
    ce qui indique un match non standard.
    """
    return bool(re.search(r'[A-Za-z]', set_str))

def parse_team_score(score: str) -> int:
    """
    Parse une chaîne de score qui contient exactement UN élément 
    (un chiffre non nul, ou la lettre 'F' ou 'P').
    """
    if score.isdigit():
        return int(score)
    else:
        return ValueError(f"Invalid score format: {score}")

def compute_volleyball_match_stats(
    sets_a: str,
    sets_b: str,
    pool: Pool,
    score_detail: str
) -> Tuple[AssociationStats, AssociationStats]:
    """
    Calcule les stats en tenant compte :
        - Des champs sets_a et sets_b (ex: "3", "1", "F", "P"), pour déterminer 
            le gagnant du match, les points de classement, et gérer les lettres F/P (plus d'actualité).
        - D'un score détaillé (score_detail), ex: "20-25,20-25,25-17,23-25"
            qui décrit chaque set et permet de connaître le total de points et de sets réellement gagnés.
    """

    # ------------------ 1) Création des stats vides ------------------
    stats_a = AssociationStats()
    stats_b = AssociationStats()

    # ------------------ 2) Parse du score détaillé -------------------
    if score_detail:
        sets_list = score_detail.split(",")
        for raw_set in sets_list:
            raw_set = raw_set.strip()
            if not raw_set:
                continue
            try:
                # Parse "X-Y"
                x_str, y_str = raw_set.split("-")
                x = int(x_str)
                y = int(y_str)
            except ValueError:
                # format invalide => on ignore ce set ou on log un warning
                continue
            
            # Incrémente le total de points marqués
            stats_a.won_points += x
            stats_b.won_points += y

            # Qui gagne ce set ?
            if x > y:
                stats_a.won_sets += 1
                stats_b.lost_sets += 1
            elif y > x:
                stats_b.won_sets += 1
                stats_a.lost_sets += 1
            else:
                # Égalité improbable => skip
                pass

        # Incrémente symétriquement la partie "lost_points"
        stats_a.lost_points = stats_b.won_points
        stats_b.lost_points = stats_a.won_points

    # ------------------ 3) Parse sets_a / sets_b comme avant -------------------
    num_a = parse_team_score(sets_a)
    num_b = parse_team_score(sets_b)

    # Cas particulier : si les deux côtés sont "lettres" => scores = 0
    if num_a is None and num_b is None:
        num_a = 0
        num_b = 0
        stats_a.losses = 1
        stats_b.losses = 1
    else:
        # Si un des deux est None => on le force à 0
        if num_a is None:
            num_a = 0
        if num_b is None:
            num_b = 0
        
        # Empêcher 3-3 ou 1-1 => improbable => on force 0-0 si c'est le cas
        if num_a == num_b and num_a != 0:
            num_a, num_b = 0, 0

        # Qui gagne ?
        if num_a > num_b:
            # A GAGNANT
            stats_a.wins = 1
            stats_b.losses = 1

            if num_a == 2:
                if num_b == 0:
                    stats_a.points = 3
                    stats_b.points = 0
                    stats_a.wins_three_to_zero = 1
                    stats_b.losses_zero_to_three = 1
                elif num_b == 1:
                    stats_a.points = 2
                    stats_b.points = 1
                    stats_a.wins_three_to_two = 1
                    stats_b.losses_two_to_three = 1
            elif num_a == 3:
                if num_b == 0:
                    stats_a.points = 3
                    stats_b.points = 0
                    stats_a.wins_three_to_zero = 1
                    stats_b.losses_zero_to_three = 1
                elif num_b == 1:
                    stats_a.points = 3
                    stats_b.points = 0
                    stats_a.wins_three_to_one = 1
                    stats_b.losses_one_to_three = 1
                elif num_b == 2:
                    stats_a.points = 2
                    stats_b.points = 1
                    stats_a.wins_three_to_two = 1
                    stats_b.losses_two_to_three = 1
            elif num_a == 1:
                # Rare
                stats_a.points = 2
                stats_b.points = 0
                stats_a.wins_three_to_zero = 1
                stats_b.losses_zero_to_three = 1

        elif num_b > num_a:
            # B GAGNANT
            stats_b.wins = 1
            stats_a.losses = 1

            if num_b == 2:
                if num_a == 0:
                    stats_b.points = 3
                    stats_a.points = 0
                    stats_b.wins_three_to_zero = 1
                    stats_a.losses_zero_to_three = 1
                elif num_a == 1:
                    stats_b.points = 2
                    stats_a.points = 1
                    stats_b.wins_three_to_two = 1
                    stats_a.losses_two_to_three = 1
            elif num_b == 3:
                if num_a == 0:
                    stats_b.points = 3
                    stats_a.points = 0
                    stats_b.wins_three_to_zero = 1
                    stats_a.losses_zero_to_three = 1
                elif num_a == 1:
                    stats_b.points = 3
                    stats_a.points = 0
                    stats_b.wins_three_to_one = 1
                    stats_a.losses_one_to_three = 1
                elif num_a == 2:
                    stats_b.points = 2
                    stats_a.points = 1
                    stats_b.wins_three_to_two = 1
                    stats_a.losses_two_to_three = 1
            elif num_b == 1:
                stats_b.points = 2
                stats_a.points = 0
                stats_b.wins_three_to_zero = 1
                stats_a.losses_zero_to_three = 1

    return stats_a, stats_b