from typing import Optional
import aiohttp
from config.env_config import POOL_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.pool import Pool
from api.auth0 import _get_auth_headers


@handle_api_response(response_type=Pool)
async def get_pool_by_code_league_season(
    session: aiohttp.ClientSession, pool_code: str, league_code: str, season: int
) -> Optional[Pool]:
    """
    Vérifie si une pool existe déjà via l'API en utilisant pool_code, league_code et season.
    """
    headers = _get_auth_headers()
    return await session.get(f"{POOL_API_URL}/pools/{pool_code}/{league_code}/{season}", headers=headers)


@handle_api_response(response_type=list[Pool])
async def get_pools_by_league_and_season(session: aiohttp.ClientSession, league_code: str, season: int) -> list[Pool]:
    """
    Récupère toutes les pools pour un code de ligue et une saison spécifiques.
    """
    headers = _get_auth_headers()
    return await session.get(f"{POOL_API_URL}/pools/league/{league_code}/season/{season}", headers=headers)


@handle_api_response(response_type=Pool)
async def create_pool(session: aiohttp.ClientSession, pool: Pool) -> Pool:
    """
    Envoie une requête POST pour créer une nouvelle pool.
    """
    headers = _get_auth_headers()
    pool_dict = pool.to_dict()
    response = await session.post(f"{POOL_API_URL}/pools", json=pool_dict, headers=headers)
    log_event(
        action="create_pool",
        level="info",
        pool_code=pool.pool_code,
        division_name=pool.division_name
    )
    return response


@handle_api_response(response_type=Pool)
async def update_pool(session: aiohttp.ClientSession, pool: Pool, changes_list: list[str] = []) -> Pool:
    """
    Envoie une requête PUT pour mettre à jour une pool existante.
    """
    headers = _get_auth_headers()
    pool_dict = pool.to_dict()
    response = await session.put(f"{POOL_API_URL}/pools/{pool.id}", json=pool_dict, headers=headers)
    log_event(
        action="update_pool",
        level="info",
        pool_code=pool.pool_code,
        changes_list=changes_list
    )
    return response


@handle_api_response(response_type=list[Pool])
async def get_active_pools_by_league_code(session: aiohttp.ClientSession, league_code: str) -> Optional[list[Pool]]:
    """
    Récupère les pools actives pour une ligue donnée.
    """
    headers = _get_auth_headers()
    return await session.get(f"{POOL_API_URL}/pools/active?league_code={league_code}", headers=headers)