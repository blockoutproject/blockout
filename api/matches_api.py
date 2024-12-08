import aiohttp
from datetime import datetime
from typing import Optional
from config.env_config import MATCH_API_URL
from config.logger_config import log_event
from models.match import Match, MatchStatus
from utils.handlers.error_handler import handle_errors
from utils.handlers.api_handler import handle_api_response

@handle_errors
@handle_api_response(response_type=Match)
async def get_match_by_league_and_code(session: aiohttp.ClientSession, league_code: str, match_code: str) -> Optional[Match]:
    log_event(action="get_match_by_league_and_code", level="debug", league_code=league_code, match_code=match_code)
    return await session.get(f"{MATCH_API_URL}/{league_code}/{match_code}")


@handle_errors
@handle_api_response(response_type=list[Match])
async def get_active_matches_by_pool_id(session: aiohttp.ClientSession, pool_id: int) -> Optional[list[Match]]:
    """
    Récupère les matchs actifs pour une pool donnée.
    """
    log_event(action="get_active_matches_by_pool_id", level="debug", pool_id=pool_id)
    return await session.get(f"{MATCH_API_URL}/active?pool_id={pool_id}")


@handle_errors
@handle_api_response(response_type=list[Match])
async def get_matches_by_pool(session: aiohttp.ClientSession, pool_id: int) -> list[Match]:
    """
    Récupère tous les matchs d'une poule via une seule requête.
    """
    log_event(action="get_matches_by_pool", level="debug", pool_id=pool_id)
    return await session.get(f"{MATCH_API_URL}/pool/{pool_id}")


@handle_errors
@handle_api_response(response_type=Match)
async def create_match(session: aiohttp.ClientSession, match: Match) -> Match:
    """
    Envoie une requête POST pour créer un nouveau match.
    """
    match_dict = match.to_dict()
    response = await session.post(MATCH_API_URL, json=match_dict)
    log_event(action="match_created", level="info", match_code=match.match_code, pool_id=match.pool_id)
    return response


@handle_errors
@handle_api_response(response_type=Match)
async def update_match(session: aiohttp.ClientSession, match: Match, changes: list[str] = []) -> Match:
    """
    Envoie une requête PUT pour mettre à jour un match existant.
    """
    match_dict = match.to_dict()
    response = await session.put(f"{MATCH_API_URL}/{match.id}", json=match_dict)
    log_event(action="match_updated", level="info", match_code=match.match_code, changes=changes)
    return response


@handle_errors
@handle_api_response(response_type=None)
async def deactivate_match(session: aiohttp.ClientSession, match_id: int) -> None:
    """
    Désactive un match en envoyant une requête PUT à une route dédiée.
    """
    await session.put(f"{MATCH_API_URL}/{match_id}/deactivate")
    log_event(action="match_deactivated", level="info", match_id=match_id)


@handle_errors
@handle_api_response(response_type=list[Match])
async def get_started_matches(session: aiohttp.ClientSession, status: MatchStatus, active: bool, current_time: str) -> Optional[list[Match]]:
    """
    Récupère les matchs qui ont commencé via l'API.
    """
    params = {
        'status': status,
        'active': str(active).lower(),
        'current_time': current_time
    }
    log_event(
        action="get_started_matches",
        level="debug",
        status=status.name,
        active=active,
        current_time=current_time,
        message="Récupération des matchs qui ont commencé."
    )
    return await session.get(f"{MATCH_API_URL}/started", params=params)


@handle_errors
@handle_api_response(response_type=Match)
async def get_match_by_pool_teams_date(
    session: aiohttp.ClientSession,
    pool_id: int,
    team_id_a: int,
    team_id_b: int,
    match_date: datetime
) -> Optional[Match]:
    """
    Récupère un match spécifique basé sur pool_id, team_id_a, team_id_b et match_date.
    """
    params = {
        'pool_id': pool_id,
        'team_id_a': team_id_a,
        'team_id_b': team_id_b,
        'match_date': match_date.isoformat()
    }
    log_event(
        action="get_match_by_pool_teams_date",
        level="debug",
        pool_id=pool_id,
        team_id_a=team_id_a,
        team_id_b=team_id_b,
        match_date=match_date.isoformat(),
        message="Recherche d'un match par pool, équipes et date."
    )
    return await session.get(f"{MATCH_API_URL}/search", params=params)