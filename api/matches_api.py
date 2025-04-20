from typing import Optional, List
import aiohttp
from datetime import datetime
from api.auth0 import _get_auth_headers
from config.env_config import MATCH_API_URL
from config.logger_config import log_event
from models.match import Match, MatchStatus
from utils.handlers.api_handler import handle_api_response
from utils.utils import to_dict


@handle_api_response(response_type=Match)
async def get_match_by_pool_teams_date(
    session: aiohttp.ClientSession,
    pool_id: int,
    team_id_a: int,
    team_id_b: int,
    match_date: datetime
) -> Optional[Match]:
    """
    Récupère un match selon poule, équipes et date.
    """
    headers = _get_auth_headers()
    params = {
        "teamIdA": team_id_a,
        "teamIdB": team_id_b,
        "matchDate": match_date.isoformat()
    }
    url = f"{MATCH_API_URL}/pools/{pool_id}/matches/search"
    response = await session.get(url, params=params, headers=headers)
    return response


@handle_api_response(response_type=List[Match])
async def get_matches_by_pool(
    session: aiohttp.ClientSession,
    pool_id: int
) -> Optional[List[Match]]:
    """
    Récupère tous les matchs d'une poule (filtre poolId).
    """
    headers = _get_auth_headers()
    params = {"poolId": pool_id}
    url = f"{MATCH_API_URL}/matches"
    response = await session.get(url, params=params, headers=headers)
    return response


@handle_api_response(response_type=List[Match])
async def get_active_matches_by_pool_id(
    session: aiohttp.ClientSession,
    pool_id: int
) -> Optional[List[Match]]:
    """
    Récupère les matchs actifs pour une poule donnée.
    """
    headers = _get_auth_headers()
    params = {"poolId": pool_id, "active": "true"}
    url = f"{MATCH_API_URL}/matches"
    response = await session.get(url, params=params, headers=headers)
    return response


@handle_api_response(response_type=List[Match])
async def get_started_matches(
    session: aiohttp.ClientSession,
    status: MatchStatus,
    active: bool,
    current_time: str
) -> Optional[List[Match]]:
    """
    Récupère les matchs qui ont commencé (status 'UPCOMING' et date ≤ maintenant).
    """
    headers = _get_auth_headers()
    params = {
        "status": status.value if hasattr(status, "value") else status,
        "active": str(active).lower(),
        "currentTime": current_time
    }
    url = f"{MATCH_API_URL}/matches/started"
    response = await session.get(url, params=params, headers=headers)
    return response


@handle_api_response(response_type=Match)
async def create_match(
    session: aiohttp.ClientSession,
    match: Match
) -> Match:
    """
    Crée un nouveau match avec les informations fournies.
    """
    headers = _get_auth_headers()
    match_dict = to_dict(match)
    url = f"{MATCH_API_URL}/matches"
    response = await session.post(url, json=match_dict, headers=headers)
    log_event(
        action="create_match",
        level="info",
        match_code=match.match_code,
        pool_id=match.pool_id,
        message=f"POST {url} - Création du match."
    )
    return response


@handle_api_response(response_type=Match)
async def update_match(
    session: aiohttp.ClientSession,
    match: Match,
    changes_list: list[str] = []
) -> Match:
    """
    Met à jour un match existant.
    """
    headers = _get_auth_headers()
    match_dict = to_dict(match)
    url = f"{MATCH_API_URL}/matches/{match.id}"
    response = await session.put(url, json=match_dict, headers=headers)
    log_event(
        action="update_match",
        level="info",
        match_code=match.match_code,
        changes_list=changes_list,
        message=f"PUT {url} - Mise à jour du match."
    )
    return response


@handle_api_response(response_type=None)
async def bulk_deactivate_matches(
    session: aiohttp.ClientSession,
    pool_id: int,
    missing_match_codes: set[str]
) -> None:
    """
    Désactive en masse les matchs correspondant aux codes fournis.
    """
    headers = _get_auth_headers()
    url = f"{MATCH_API_URL}/pools/{pool_id}/matches/bulk-deactivate"
    payload = {"missing_match_codes": list(missing_match_codes)}
    response = await session.put(url, json=payload, headers=headers)
    log_event(
        action="bulk_deactivate_matches",
        level="info",
        message=f"PUT {url} - Désactivation en masse des matchs : {missing_match_codes}."
    )
    return response