from typing import Optional, Tuple
from models.association_stats import AssociationStats
from models.pool import Pool, PoolDivisionCode

def parse_team_score(score: str) -> Tuple[Optional[int], str]:
    """
    Parse une chaîne de score qui contient exactement UN élément.
    
    Si la chaîne représente un chiffre (différent de "0"), renvoie (nombre, "").
    Si la chaîne représente une lettre (F ou P), renvoie (None, lettre).
    Sinon, lève une ValueError.
    
    Exemples :
        "3"  -> (3, "")
        "F"  -> (None, "F")
        "P"  -> (None, "P")
    """
    if score.isdigit():
        num = int(score)
        return num, ""
    elif score in ("F", "P"):
        return None, score
    else:
        # raise ValueError(f"Format de score invalide: '{score}'")
        return None, "" # On ne lève pas d'erreur, mais on renvoie None pour le nombre. Stats initiées à 0. Il faut logguer l'erreur.

def compute_volleyball_match_stats(score_a: str, score_b: str, pool: Pool, ida, idb, match_code) -> Tuple[AssociationStats, AssociationStats]:
    """
    Calcule les statistiques d'un match de volley-ball en tenant compte d'un score
    dont chaque côté est représenté par UN élément (soit un chiffre non nul, soit une lettre F ou P).

    Règles de base (numériques) :

        - Pour une pool non Junior (Régional, National, etc.) :
            * Le gagnant doit afficher 3.
            * Le perdant doit afficher 0, 1 ou 2.
            * Si le score est 3-1 : gagnant = 3 points, perdant = 0.
            * Si le score est 3-2 : gagnant = 2 points, perdant = 1.

        - Pour une pool Junior :
            * Le match peut se jouer en format 2 sets gagnants ou 3 sets gagnants.
            * Si le gagnant affiche 2 (format 2 sets gagnants), le perdant doit afficher 0 ou 1.
                - En 2-0, le gagnant reçoit 3 points et le perdant 0.
                - En 2-1, le gagnant reçoit 2 points et le perdant 1.
            * Si le gagnant affiche 3 (format 3 sets gagnants), le perdant doit afficher 0, 1 ou 2,
                avec la même attribution de points que pour les autres pools.
            * Dans tous les cas, un match avec score numérique égal est invalide.
    
    Les ajustements liés aux lettres (F et P) s'appliquent ensuite,
    différemment selon que le pool est Régional (et autres) ou National.
    
    Lève une ValueError en cas d'incohérence.
    Renvoie un tuple (stats_a, stats_b) d'instances d'AssociationStats.
    """
    # Parse de chaque côté
    num_a, letter_a = parse_team_score(score_a)
    num_b, letter_b = parse_team_score(score_b)
    
    division = pool.division_code  # Instance de PoolDivisionCode

    # Cas particulier : si les deux côtés sont uniquement des lettres,
    # on ne peut pas déterminer un gagnant sur la base du score numérique.
    # Ici, nous assignons temporairement les deux scores numériques à 0 pour
    # permettre l'application des ajustements par lettres ultérieurement,
    # et nous considérons que les deux équipes sont "perdantes".
    if num_a is None and num_b is None:
        num_a = 0
        num_b = 0
        # On n'attribue pas directement de points ici, le calcul se fera via les ajustements.
        stats_a = AssociationStats(losses=1, points=0)
        stats_b = AssociationStats(losses=1, points=0)
    else:
        # Si une seule équipe est représentée uniquement par une lettre, on lui assigne 0.
        if num_a is None and num_b is not None:
            num_a = 0
        if num_b is None and num_a is not None:
            num_b = 0
        
        # Vérification que le score numérique n'est pas égal (sauf pour le cas double lettre traité ci-dessus)
        if num_a == num_b:
            # raise ValueError("Le score numérique ne peut pas être égal en volley-ball.")
            num_a = 0 # On ne lève pas d'erreur, mais on renvoie 0 pour les deux équipes. Il faut logguer l'erreur.
            num_b = 0
    
        stats_a = AssociationStats()
        stats_b = AssociationStats()
    
        # Traitement selon le gagnant
        if num_a > num_b:
            stats_a.wins = 1
            stats_b.losses = 1
            if num_a > 1:
                if num_a == 2:
                    # Format 2 sets gagnants : le perdant doit être 0 ou 1.
                    if num_b == 0:
                        stats_a.points = 3
                        stats_b.points = 0
                    elif num_b == 1:
                        stats_a.points = 2
                        stats_b.points = 1
                    else:
                        raise ValueError("Pour un match au format 2 sets gagnants, le score perdant doit être 0 ou 1.")
                elif num_a == 3:
                    # Format 3 sets gagnants : le perdant doit être 0, 1 ou 2.
                    if num_b in (0, 1):
                        stats_a.points = 3
                        stats_b.points = 0
                    elif num_b == 2:
                        stats_a.points = 2
                        stats_b.points = 1
                    else:
                        raise ValueError("Pour un match au format 3 sets gagnants, le score perdant doit être 0, 1 ou 2.")
            else:
                # cas particulier : match en 1 set gagnant
                if num_a == 1:
                    stats_a.points = 2
                    stats_b.points = 0
        else:
            # Cas où num_b > num_a
            stats_b.wins = 1
            stats_a.losses = 1
            if num_b > 1:
                if num_b == 2:
                    if num_a == 0:
                        stats_b.points = 3
                        stats_a.points = 0
                    elif num_a == 1:
                        stats_b.points = 2
                        stats_a.points = 1
                    else:
                        raise ValueError("Pour un match au format 2 sets gagnants, le score perdant doit être 0 ou 1.")
                elif num_b == 3:
                    if num_a in (0, 1):
                        stats_b.points = 3
                        stats_a.points = 0
                    elif num_a == 2:
                        stats_b.points = 2
                        stats_a.points = 1
                    else:
                        raise ValueError("Pour un match au format 3 sets gagnants, le score perdant doit être 0, 1 ou 2.")
            else:
                if num_a == 1:
                    stats_b.points = 2
                    stats_a.points = 0
    
    # Ajustement en fonction des lettres et du type de pool.
    if division in (PoolDivisionCode.REG, PoolDivisionCode.OTHER):
        # Pour une pool Régional (et autres) :
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
        # Pour une pool National :
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