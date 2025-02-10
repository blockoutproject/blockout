from typing import Tuple, Optional
from models.pool import Pool, PoolDivisionCode
from models.association_stats import AssociationStats

def parse_team_score(score: str) -> Tuple[Optional[int], str]:
    """
    Parse une chaîne de score qui contient exactement UN élément 
    (un chiffre non nul, ou la lettre 'F' ou 'P').

    Renvoie (nombre, "") si c'est un chiffre (ex: "3" -> (3, "")).
    Renvoie (None, "F") ou (None, "P") si c'est une lettre.
    Renvoie (None, "") si c'est un format inattendu.

    Exemple : 
        "3" -> (3, "")
        "F" -> (None, "F")
        "P" -> (None, "P")
    """
    if score.isdigit():
        return int(score), ""
    elif score in ("F", "P"):
        return None, score
    else:
        return None, ""  # Pas levé d'exception ici, libre à toi de logguer

def compute_volleyball_match_stats(
    sets_a: str,
    sets_b: str,
    pool: Pool,
    score_detail: str
) -> Tuple[AssociationStats, AssociationStats]:
    """
    Calcule les stats de volley-ball en tenant compte :
        - Des champs sets_a et sets_b (ex: "3", "1", "F", "P"), pour déterminer 
            le gagnant du match, les points de classement, et gérer les lettres F/P.
        - D'un score détaillé (score_detail), ex: "20-25,20-25,25-17,23-25"
            qui décrit chaque set et permet de connaître le total de points et de sets réellement gagnés.
    """

    # ------------------ 1) Création des stats vides ------------------
    stats_a = AssociationStats()
    stats_b = AssociationStats()

    # ------------------ 2) Parse du score détaillé -------------------
    #    ex: "20-25,20-25,25-17,23-25" => on compte sets gagnés/perdus + points
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
    # parse_team_score renvoie (num, letter), ex: (3, "")
    num_a, letter_a = parse_team_score(sets_a)
    num_b, letter_b = parse_team_score(sets_b)

    division = pool.division_code  # Par ex. NAT, REG, etc.

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
                    stats_a.wins_3_0 = 1
                    stats_b.losses_0_3 = 1
                elif num_b == 1:
                    stats_a.points = 2
                    stats_b.points = 1
                    stats_a.wins_3_2 = 1
                    stats_b.losses_2_3 = 1
            elif num_a == 3:
                if num_b == 0:
                    stats_a.points = 3
                    stats_b.points = 0
                    stats_a.wins_3_0 = 1
                    stats_b.losses_0_3 = 1
                elif num_b == 1:
                    stats_a.points = 3
                    stats_b.points = 0
                    stats_a.wins_3_1 = 1
                    stats_b.losses_1_3 = 1
                elif num_b == 2:
                    stats_a.points = 2
                    stats_b.points = 1
                    stats_a.wins_3_2 = 1
                    stats_b.losses_2_3 = 1
            elif num_a == 1:
                # Rare
                stats_a.points = 2
                stats_b.points = 0
                stats_a.wins_3_0 = 1
                stats_b.losses_0_3 = 1

        elif num_b > num_a:
            # B GAGNANT
            stats_b.wins = 1
            stats_a.losses = 1

            if num_b == 2:
                if num_a == 0:
                    stats_b.points = 3
                    stats_a.points = 0
                    stats_b.wins_3_0 = 1
                    stats_a.losses_0_3 = 1
                elif num_a == 1:
                    stats_b.points = 2
                    stats_a.points = 1
                    stats_b.wins_3_2 = 1
                    stats_a.losses_2_3 = 1
            elif num_b == 3:
                if num_a == 0:
                    stats_b.points = 3
                    stats_a.points = 0
                    stats_b.wins_3_0 = 1
                    stats_a.losses_0_3 = 1
                elif num_a == 1:
                    stats_b.points = 3
                    stats_a.points = 0
                    stats_b.wins_3_1 = 1
                    stats_a.losses_1_3 = 1
                elif num_a == 2:
                    stats_b.points = 2
                    stats_a.points = 1
                    stats_b.wins_3_2 = 1
                    stats_a.losses_2_3 = 1
            elif num_b == 1:
                stats_b.points = 2
                stats_a.points = 0
                stats_b.wins_3_0 = 1
                stats_a.losses_0_3 = 1

    # ------------------ 4) Gestion des lettres F/P selon la division ------------------
    if division in (PoolDivisionCode.REG, PoolDivisionCode.OTHER):
        if letter_a == "F" and letter_b == "F":
            stats_a.points -= 2
            stats_b.points -= 2
        elif letter_a == "P" and letter_b == "P":
            stats_a.points -= 1
            stats_b.points -= 1
        else:
            if letter_a == "F" and letter_b != "F":
                stats_a.points -= 3
            if letter_b == "F" and letter_a != "F":
                stats_b.points -= 3
            if letter_a == "P" and letter_b != "P":
                stats_a.points -= 2
            if letter_b == "P" and letter_a != "P":
                stats_b.points -= 2

    elif division == PoolDivisionCode.NAT:
        if letter_a == "F" and letter_b == "F":
            stats_a.points -= 2
            stats_b.points -= 2
        elif letter_a == "P" and letter_b == "P":
            stats_a.points -= 1
            stats_b.points -= 1
        else:
            if letter_a == "F" and letter_b != "F":
                stats_a.points -= 2
            if letter_b == "F" and letter_a != "F":
                stats_b.points -= 2
            if letter_a == "P" and letter_b != "P":
                stats_a.points -= 1
            if letter_b == "P" and letter_a != "P":
                stats_b.points -= 1

    return stats_a, stats_b