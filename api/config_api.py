from typing import Optional, List
import aiohttp
from config.env_config import CONFIG_API_URL
from config.logger_config import log_event
from models.raw_division_mapping import RawDivisionMapping
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers
from utils.utils import to_dict


@handle_api_response(response_type=List[RawDivisionMapping])
async def get_raw_division_mappings_by_league_and_season(
    session: aiohttp.ClientSession,
    league_code: Optional[str],
    season: Optional[int]
) -> List[RawDivisionMapping]:
    """
    Récupère tous les raw pool mappings pour un code de ligue et une saison spécifiques.
    """
    headers = _get_headers()
    params = {"league_code": league_code, "season": season}
    url = f"{CONFIG_API_URL}/raw-pools"
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
    mapping_dict = to_dict(mapping)
    url = f"{CONFIG_API_URL}/raw-pools"
    response = await session.post(url, json=mapping_dict, headers=headers)
    log_event(
        action="create_raw_division_mapping",
        level="info",
        league_code=mapping.league_code,
        raw_division_name=mapping.raw_division_name
    )
    return response