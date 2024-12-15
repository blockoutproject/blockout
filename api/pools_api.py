from typing import Optional
import aiohttp
from config.env_config import POOL_API_URL
from config.logger_config import log_event
from utils.handlers.error_handler import handle_errors
from utils.handlers.api_handler import handle_api_response
from models.pool import Pool

@handle_errors
@handle_api_response(response_type=Pool)
async def get_pool_by_code_league_season(
    session: aiohttp.ClientSession, pool_code: str, league_code: str, season: int
) -> Optional[Pool]:
    """
    Vérifie si une pool existe déjà via l'API en utilisant pool_code, league_code et season.
    """
    return await session.get(f"{POOL_API_URL}/{pool_code}/{league_code}/{season}")


@handle_errors
@handle_api_response(response_type=list[Pool])
async def get_pools_by_league_and_season(session: aiohttp.ClientSession, league_code: str, season: int) -> list[Pool]:
    """
    Récupère toutes les pools pour un code de ligue et une saison spécifiques.
    """
    return await session.get(f"{POOL_API_URL}/league/{league_code}/season/{season}")


@handle_errors
@handle_api_response(response_type=Pool)
async def create_pool(session: aiohttp.ClientSession, pool: Pool) -> Pool:
    """
    Envoie une requête POST pour créer une nouvelle pool.
    """
    pool_dict = pool.to_dict()
    response = await session.post(POOL_API_URL, json=pool_dict)
    log_event(
        action="create_pool",
        level="info",
        pool_code=pool.pool_code,
        division_name=pool.division_name
    )
    return response


@handle_errors
@handle_api_response(response_type=Pool)
async def update_pool(session: aiohttp.ClientSession, pool: Pool, changes: list[str] = []) -> Pool:
    """
    Envoie une requête PUT pour mettre à jour une pool existante.
    """
    pool_dict = pool.to_dict()
    response = await session.put(f"{POOL_API_URL}/{pool.id}", json=pool_dict)
    log_event(
        action="update_pool",
        level="info",
        pool_code=pool.pool_code,
        changes=changes
    )
    return response


@handle_errors
@handle_api_response(response_type=list[Pool])
async def get_active_pools_by_league_code(session: aiohttp.ClientSession, league_code: str) -> Optional[list[Pool]]:
    """
    Récupère les pools actives pour une ligue donnée.
    """
    return await session.get(f"{POOL_API_URL}/active?league_code={league_code}")


@handle_errors
@handle_api_response(response_type=None)
async def deactivate_pool(session: aiohttp.ClientSession, pool_id: int) -> None:
    """
    Désactive une pool en mettant à jour son statut 'active' à False.
    """
    reponse = await session.put(f"{POOL_API_URL}/{pool_id}/deactivate")
    log_event(
        action="deactivate_pool",
        level="info",
        pool_id=pool_id
    )
    return reponse