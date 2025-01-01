import aiohttp
from datetime import datetime
from typing import Optional
from api.auth0 import _get_auth_headers
from config.env_config import MATCH_API_URL
from config.logger_config import log_event
from models.match import Match, MatchStatus
from utils.handlers.api_handler import handle_api_response


@handle_api_response(response_type=Match)
async def get_match_by_league_and_code(session: aiohttp.ClientSession, league_code: str, match_code: str) -> Optional[Match]:
    headers = _get_auth_headers()
    return await session.get(f"{MATCH_API_URL}/leagues/{league_code}/matches/{match_code}", headers=headers)


@handle_api_response(response_type=list[Match])
async def get_active_matches_by_pool_id(session: aiohttp.ClientSession, pool_id: int) -> Optional[list[Match]]:
    """
    Récupère les matchs actifs pour une pool donnée.
    """
    headers = _get_auth_headers()
    return await session.get(f"{MATCH_API_URL}/pools/{pool_id}/matches/active", headers=headers)


@handle_api_response(response_type=list[Match])
async def get_matches_by_pool(session: aiohttp.ClientSession, pool_id: int) -> list[Match]:
    """
    Récupère tous les matchs d'une poule via une seule requête.
    """
    headers = _get_auth_headers()
    return await session.get(f"{MATCH_API_URL}/pools/{pool_id}/matches", headers=headers)


@handle_api_response(response_type=Match)
async def create_match(session: aiohttp.ClientSession, match: Match) -> Match:
    """
    Envoie une requête POST pour créer un nouveau match.
    """
    headers = _get_auth_headers()
    match_dict = match.to_dict()
    response = await session.post(f"{MATCH_API_URL}/matches", json=match_dict, headers=headers)
    log_event(
        action="create_match", 
        level="info", 
        match_code=match.match_code, 
        pool_id=match.pool_id
    )
    return response


@handle_api_response(response_type=Match)
async def update_match(session: aiohttp.ClientSession, match: Match, changes_list: list[str] = []) -> Match:
    """
    Envoie une requête PUT pour mettre à jour un match existant.
    """
    headers = _get_auth_headers()
    match_dict = match.to_dict()
    response = await session.put(f"{MATCH_API_URL}/matches/{match.id}", json=match_dict, headers=headers)
    log_event(
        action="update_match", 
        level="info", 
        match_code=match.match_code, 
        changes_list=changes_list
    )
    return response


@handle_api_response(response_type=None)
async def deactivate_match(session: aiohttp.ClientSession, match_id: int) -> None:
    """
    Désactive un match en envoyant une requête PUT à une route dédiée.
    """
    headers = _get_auth_headers()
    response = await session.put(f"{MATCH_API_URL}/matches/{match_id}/deactivate", headers=headers)
    log_event(
        action="deactivate_match", 
        level="info", 
        match_id=match_id
    )
    return response


@handle_api_response(response_type=list[Match])
async def get_started_matches(session: aiohttp.ClientSession, status: MatchStatus, active: bool, current_time: str) -> Optional[list[Match]]:
    """
    Récupère les matchs qui ont commencé via l'API.
    """
    headers = _get_auth_headers()
    params = {
        'status': status,
        'active': str(active).lower(),
        'current_time': current_time
    }
    return await session.get(f"{MATCH_API_URL}/matches/started", params=params, headers=headers)


@handle_api_response(response_type=Match)
async def get_match_by_pool_teams_date(session: aiohttp.ClientSession, pool_id: int, team_id_a: int, team_id_b: int, match_date: datetime) -> Optional[Match]:
    """
    Récupère un match spécifique basé sur pool_id, team_id_a, team_id_b et match_date.
    """
    headers = _get_auth_headers()
    params = {
        'team_id_a': team_id_a,
        'team_id_b': team_id_b,
        'match_date': match_date.isoformat()
    }
    return await session.get(f"{MATCH_API_URL}/pools/{pool_id}/matches/search", params=params, headers=headers)