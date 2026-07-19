from dataclasses import asdict
from datetime import datetime
from enum import Enum
import re
from typing import Optional
from config.logger_config import log_event


def extract_season_from_url(url: str) -> Optional[str]:
    """
    Extrait la saison à partir de l'URL.
    """
    try:
        match = re.search(r'/(\d{4})-(\d{4})/', url)
        if match:
            start_year, end_year = match.groups()
            return f"{start_year}/{end_year}"
        log_event(
            action="extract_season_from_url",
            level="warning",
            message=f"Aucune saison trouvée dans l'URL: {url}"
        )
        return None
    except Exception as e:
        log_event(
            action="extract_season_from_url",
            level="error",
            message=f"Erreur lors de l'extraction de la saison depuis l'URL '{url}'",
            error=str(e)
        )
        raise
    
def capitalize_words(text: str | None) -> str:
    """
    Transforme une chaîne tout en majuscules en capitalisant chaque mot.
    Gère les séparateurs espaces et tirets, et supporte None ou chaînes vides.

    Exemples :
        - "NOUVELLE AQUITAINE" → "Nouvelle Aquitaine"
        - "PROVENCE-ALPES-CÔTE D'AZUR" → "Provence-Alpes-Côte D'Azur"
        - None → ""
    """
    if not text:
        return ""

    parts = re.split(r'([- ])', text.strip())
    return ''.join(
        p.capitalize() if p not in [' ', '-'] else p
        for p in parts
    )
    
def parse_date(date_str: str, time_str: str) -> Optional[datetime]:
    """
    Convertit des chaînes de date et d'heure en objet datetime.
    """
    try:
        return datetime.strptime(f'{date_str} {time_str}', '%Y-%m-%d %H:%M')
    except ValueError as e:
        # log_event(
        #     action="parse_date",
        #     level="error",
        #     message=f"Erreur lors de la conversion des dates: {date_str} {time_str}",
        #     error=str(e)
        # )
        return None
    
def to_dict(object) -> dict:
    """
    Convertit l'instance actuelle en un dictionnaire compatible JSON.
    Gère les champs Enum et datetime.
    """
    result = {}
    for key, value in asdict(object).items():
        if isinstance(value, Enum):
            result[key] = value.value  # Convertir Enum en sa valeur
        elif isinstance(value, datetime):
            result[key] = value.isoformat()  # Convertir datetime en format ISO 8601
        else:
            result[key] = value  # Conserver les autres types
    return result