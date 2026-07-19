from typing import Optional, List
import aiohttp
from config.env_config import CONFIG_API_URL
from config.logger_config import log_event
from models.raw_division_mapping import RawDivisionMapping
from models.scraper_status import ScraperStatus
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers


@handle_api_response(response_type=List[RawDivisionMapping])
async def get_raw_division_mappings_by_league_and_season(
    session: aiohttp.ClientSession,
    leagueCode: Optional[str],
    season: Optional[str]
) -> List[RawDivisionMapping]:
    """
    Récupère tous les raw pool mappings pour un code de ligue et une saison spécifiques.
    """
    headers = _get_headers()
    params = {"leagueCode": leagueCode, "season": season}
    url = f"{CONFIG_API_URL}/raw-divisions"
    return await session.get(url, params=params, headers=headers)


@handle_api_response(response_type=RawDivisionMapping)
async def create_raw_division_mapping(
    session: aiohttp.ClientSession,
    mapping: RawDivisionMapping
) -> RawDivisionMapping:
    """
    Envoie une requête POST pour créer un nouveau raw pool mapping.
    """
    headers = _get_headers()
    mapping_dict = _create_raw_division_mapping_payload(mapping)
    url = f"{CONFIG_API_URL}/raw-divisions"
    response = await session.post(url, json=mapping_dict, headers=headers)
    log_event(
        action="create_raw_division_mapping",
        level="info",
        leagueCode=mapping.leagueCode,
        rawDivisionName=mapping.rawDivisionName
    )
    return response


def _create_raw_division_mapping_payload(mapping: RawDivisionMapping) -> dict:
    """Build the exact config-service create request from the scraper model."""
    return {
        "rawDivisionName": mapping.rawDivisionName,
        "divisionId": mapping.divisionId,
        "format": mapping.format,
        "gender": mapping.gender,
        "leagueCode": mapping.leagueCode,
        "season": mapping.season,
    }

@handle_api_response(response_type=ScraperStatus)
async def get_scraper_status(
    session: aiohttp.ClientSession,
    scraper_name: str
) -> ScraperStatus:
    """
    Récupère le statut (activé/désactivé) d'un scraper par son nom.
    Lève une exception si le scraper n'existe pas.
    """
    headers = _get_headers()
    url = f"{CONFIG_API_URL}/scrapers/{scraper_name}/status"
    return await session.get(url, headers=headers)
