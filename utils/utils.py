from datetime import datetime
import json
import re
from typing import Optional
from config.logger_config import log_event
from models.pool import PoolDivisionCode
from contextvars import ContextVar

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

def is_junior_pool(string):
    """
    Vérifie si une chaîne contient une catégorie junior (M11, M13, M15, M18, M21).
    """
    categories = ["M11", "M13", "M15", "M18", "M21"]
    for category in categories:
        if category in string:
            return PoolDivisionCode.JNR
    return PoolDivisionCode.REG

def standardize_division_name(raw_division_name: str) -> dict:
    """
    Standardise le nom d'une division en fonction des variations prédéfinies.
    """
    try:
        for division_name, genders in standardized_divisions.items():
            for gender, variations in genders.items():
                if raw_division_name in variations:
                    division_code = is_junior_pool(raw_division_name)
                    return {"division_name": division_name, "division_code": division_code, "gender": gender}
        log_event(
            action="standardize_division_name",
            level="warning",
            message=f"Division non standardisée: {raw_division_name}"
        )
        return {"division_name": raw_division_name, "division_code": division_code, "gender": PoolDivisionCode.OTHER}
    except Exception as e:
        log_event(
            action="standardize_division_name",
            level="error",
            message=f"Erreur lors de la standardisation de '{raw_division_name}'",
            error=str(e)
        )
        raise

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

def extract_national_division(pool_name: str) -> str:
    """
    Extrait la division nationale du nom de la poule.
    """
    try:
        division_name = pool_name.split('Poule')[0].strip()
        return division_name
    except Exception as e:
        log_event(
            action="extract_national_division",
            level="error",
            message=f"Erreur inattendue lors de l'extraction de la division pour '{pool_name}'",
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
        log_event(
            action="parse_date",
            level="error",
            message=f"Erreur lors de la conversion des dates: {date_str} {time_str}",
            error=str(e)
        )
        return None