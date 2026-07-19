from dataclasses import asdict, is_dataclass
from datetime import datetime
from enum import Enum
import json
import re
from typing import Optional
import uuid
from zoneinfo import ZoneInfo
from config.logger_config import log_event

# Charger le fichier JSON avec gestion des erreurs
try:
    with open('config/mapping/standardized_divisions.json', 'r', encoding='utf-8') as f:
        standardized_divisions = json.load(f)
except Exception as e:
    log_event(
        action="load_standardized_divisions",
        level="error",
        message="Erreur lors du chargement de 'standardized_divisions.json'",
        error=str(e)
    )
    standardized_divisions = {}

def strip_department_code(raw_department_name: str) -> str:
    """
    Supprime le code département au début de la chaîne, par ex. :
    - '43 Haute Loire'      -> 'Haute Loire'
    - '01 Ain'              -> 'Ain'
    - '2A Corse-du-Sud'     -> 'Corse-du-Sud'
    - '07/26 Drôme-Ardèche' -> 'Drôme-Ardèche'
    Si le premier "mot" ne ressemble pas à un code de département, on renvoie la chaîne telle quelle.
    """
    if not raw_department_name:
        return raw_department_name

    parts = raw_department_name.split()
    if not parts:
        return raw_department_name

    first = parts[0]

    # Match :
    # - 1 à 3 chiffres :  "1", "08", "974"
    # - éventuellement une lettre : "2A", "2B"
    # - ou du type "07/26" pour les comités bi-départementaux
    if re.match(r"^\d{1,3}([A-Z]|/\d{1,3})?$", first):
        return " ".join(parts[1:]).strip()

    return raw_department_name

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

def parse_date(date_str: str, time_str: str) -> Optional[datetime]:
    """
    Convertit des chaînes de date et d'heure en objet datetime UTC.
    Si time_str == "00:00", on force directement en UTC sans conversion Paris.
    """
    try:
        naive = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")

        if time_str == "00:00":
            return naive.replace(tzinfo=ZoneInfo("UTC"))

        paris_time = naive.replace(tzinfo=ZoneInfo("Europe/Paris"))
        return paris_time.astimezone(ZoneInfo("UTC"))

    except ValueError:
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

def generate_correlation_id() -> str:
    return f"bulk-{uuid.uuid4()}"
