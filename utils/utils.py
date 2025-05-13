from dataclasses import asdict
from datetime import datetime
from enum import Enum
import json
import re
from typing import Optional
from config.logger_config import log_event
from models.format import Format
from models.gender import Gender
from contextvars import ContextVar

def parse_season(season_str: str) -> int:
    """
    Convertit une chaîne de saison 'YYYY/YYYY' en un entier combiné 'YYYYYY'.
    """
    try:
        start_year, end_year = season_str.split('/')
        combined_years = int(start_year[-2:] + end_year[-2:])
        return combined_years
    except Exception as e:
        log_event(
            action="parse_season",
            level="error",
            message=f"Erreur inattendue lors du parsing de la saison '{season_str}'",
            error=str(e)
        )
        raise

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

def extract_national_division(name: str) -> str:
    """
    Extrait la division nationale du nom de la poule.
    """
    try:
        division_name = name.split('Poule')[0].strip()
        return division_name
    except Exception as e:
        log_event(
            action="extract_national_division",
            level="error",
            message=f"Erreur inattendue lors de l'extraction de la division pour '{name}'",
            error=str(e)
        )
        raise

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