from typing import Optional, List
import aiohttp
from api.auth0 import _get_headers
from config.env_config import MATCH_API_URL
from config.logger_config import log_event
from models.match import Match
from utils.handlers.api_handler import handle_api_response
from utils.utils import to_dict


MATCH_CREATE_WRITE_FIELDS = (
    "matchCode",
    "leagueCode",
    "poolId",
    "liveCode",
    "teamIdA",
    "teamIdB",
    "matchDate",
    "season",
    "set",
    "score",
    "venue",
    "firstReferee",
    "secondReferee",
    "active",
)

MATCH_UPDATE_WRITE_FIELDS = MATCH_CREATE_WRITE_FIELDS[:-1]


def _to_match_write_payload(match: Match, fields: tuple[str, ...]) -> dict:
    serialized = to_dict(match)
    return {field: serialized[field] for field in fields}


@handle_api_response(response_type=List[Match])
async def get_matches_by_pool(
    session: aiohttp.ClientSession,
    poolId: int
) -> Optional[List[Match]]:
    """
    Récupère tous les matchs d'une poule (filtre poolId).
    """
    headers = _get_headers()
    params = {"poolId": poolId}
    url = f"{MATCH_API_URL}"
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
    headers = _get_headers()
    match_dict = _to_match_write_payload(match, MATCH_CREATE_WRITE_FIELDS)
    url = f"{MATCH_API_URL}"
    response = await session.post(url, json=match_dict, headers=headers)
    log_event(
        action="create_match",
        level="info",
        matchCode=match.matchCode,
        poolId=match.poolId,
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
    headers = _get_headers()
    match_dict = _to_match_write_payload(match, MATCH_UPDATE_WRITE_FIELDS)
    url = f"{MATCH_API_URL}/{match.id}"
    response = await session.put(url, json=match_dict, headers=headers)
    log_event(
        action="update_match",
        level="info",
        matchCode=match.matchCode,
        changes_list=changes_list,
        message=f"Mise à jour du match."
    )
    return response


@handle_api_response(response_type=None)
async def bulk_deactivate_matches(
    session: aiohttp.ClientSession,
    poolId: int,
    missing_match_codes: set[str]
) -> None:
    """
    Désactive en masse les matchs correspondant aux codes fournis.
    """
    headers = _get_headers()
    url = f"{MATCH_API_URL}/pools/{poolId}/bulk-deactivate"
    payload = {"missingMatchCodes": list(missing_match_codes)}
    response = await session.put(url, json=payload, headers=headers)
    return response
