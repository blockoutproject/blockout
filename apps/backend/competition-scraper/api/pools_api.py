from typing import List
import aiohttp
from config.env_config import POOL_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.pool import Pool
from api.auth0 import _get_headers


POOL_WRITE_FIELDS = (
    "poolCode", "leagueCode", "season", "leagueName", "rawName", "name", "shortName",
    "divisionId", "format", "gender", "active",
)


def _to_pool_write_payload(pool: Pool) -> dict:
    """Serialize only fields accepted by the handwritten Pool write boundary."""
    return {field: getattr(pool, field) for field in POOL_WRITE_FIELDS}


@handle_api_response(response_type=List[Pool])
async def get_pools_by_league_and_season(
    session: aiohttp.ClientSession,
    leagueCode: str,
    season: str
) -> List[Pool]:
    """
    Récupère toutes les pools pour un code de ligue et une saison spécifiques.
    """
    headers = _get_headers()
    params = {"leagueCode": leagueCode, "season": season}
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
    headers = _get_headers()
    pool_dict = _to_pool_write_payload(pool)
    url = f"{POOL_API_URL}"
    response = await session.post(url, json=pool_dict, headers=headers)
    log_event(
        action="create_pool",
        level="info",
        poolCode=pool.poolCode,
        divisionId=pool.divisionId
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
    headers = _get_headers()
    pool_dict = _to_pool_write_payload(pool)
    url = f"{POOL_API_URL}/{pool.id}"
    response = await session.put(url, json=pool_dict, headers=headers)
    log_event(
        action="update_pool",
        level="info",
        poolId=pool.id,
        poolCode=pool.poolCode,
        changes_list=changes_list
    )
    return response
