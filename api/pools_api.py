from typing import Optional, List
import aiohttp
from config.env_config import POOL_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.pool import Pool
from api.auth0 import _get_auth_headers
from utils.utils import to_dict


@handle_api_response(response_type=List[Pool])
async def get_pools_by_league_and_season(
    session: aiohttp.ClientSession,
    league_code: str,
    season: int
) -> List[Pool]:
    """
    Récupère toutes les pools pour un code de ligue et une saison spécifiques.
    """
    headers = _get_auth_headers()
    params = {"leagueCode": league_code, "season": season}
    url = f"{POOL_API_URL}"
    return await session.get(url, params=params, headers=headers)


@handle_api_response(response_type=Pool)
async def create_pool(
    session: aiohttp.ClientSession,
    pool: Pool
) -> Pool:
    """
    Envoie une requête POST pour créer une nouvelle pool.
    """
    headers = _get_auth_headers()
    pool_dict = to_dict(pool)
    url = f"{POOL_API_URL}"
    response = await session.post(url, json=pool_dict, headers=headers)
    log_event(
        action="create_pool",
        level="info",
        pool_code=pool.pool_code,
        division_name=pool.division_name
    )
    return response


@handle_api_response(response_type=Pool)
async def update_pool(
    session: aiohttp.ClientSession,
    pool: Pool,
    changes_list: list[str] = []
) -> Pool:
    """
    Envoie une requête PUT pour mettre à jour une pool existante.
    """
    headers = _get_auth_headers()
    pool_dict = to_dict(pool)
    url = f"{POOL_API_URL}/{pool.id}"
    response = await session.put(url, json=pool_dict, headers=headers)
    log_event(
        action="update_pool",
        level="info",
        pool_id=pool.id,
        pool_code=pool.pool_code,
        changes_list=changes_list
    )
    return response