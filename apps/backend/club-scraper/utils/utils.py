from dataclasses import asdict, is_dataclass
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

def _to_json_value(value):
    if is_dataclass(value):
        return {
            key: _to_json_value(item)
            for key, item in asdict(value).items()
        }
    if isinstance(value, dict):
        return {
            str(key): _to_json_value(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple, set)):
        return [_to_json_value(item) for item in value]
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def to_dict(object) -> dict:
    """
    Convertit l'instance actuelle en un dictionnaire compatible JSON.
    Gère les champs Enum et datetime.
    """
    return _to_json_value(object)
