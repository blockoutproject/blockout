import json
from pathlib import Path

from scraper.observability.logging import logger

_ALIASES_PATH = Path(__file__).parents[1] / "config" / "mapping" / "team_aliases.json"

try:
    with _ALIASES_PATH.open(encoding="utf-8") as f:
        team_aliases = json.load(f)
except Exception as e:
    logger.error(f"Erreur lors du chargement de 'team_aliases': {e}")
    team_aliases = {}


def normalize(name: str) -> str:
    return name.lower().strip().replace("’", "'").replace("-", " ").replace(".", "")


def get_full_name(name: str, gender: str) -> str | None:
    """
    Récupère le nom complet de l'équipe correspondant au nom donné en tenant compte du genre,
    en effectuant une comparaison insensible à la casse (uppercase).
    """
    upper_name = name.upper()
    for team in team_aliases.get("teams", []):
        if team.get("gender") == gender:
            # Vérifie si upper_name figure parmi les aliases (également convertis en uppercase)
            if any(upper_name == alias.upper() for alias in team.get("aliases", [])):
                return team["full"]
    return name  # Si aucune correspondance n'est trouvée, on renvoie le nom d'origine


def get_short_name(name: str, gender: str) -> str | None:
    """
    Récupère le nom complet de l'équipe correspondant au nom donné en tenant compte du genre,
    en effectuant une comparaison insensible à la casse (uppercase).
    """
    upper_name = name.upper()
    for team in team_aliases.get("teams", []):
        if team.get("gender") == gender:
            # Vérifie si upper_name figure parmi les aliases (également convertis en uppercase)
            if any(upper_name == alias.upper() for alias in team.get("aliases", [])):
                return team["short"]
    return name  # Si aucune correspondance n'est trouvée, on renvoie le nom d'origine
