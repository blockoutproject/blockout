from typing import List, Optional
import aiohttp
from config.env_config import TEAM_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.team import Team
from api.auth0 import _get_headers
from utils.utils import to_dict


@handle_api_response(response_type=Team)
async def create_team(session: aiohttp.ClientSession, team: Team) -> Team:
    """
    Envoie une requête POST pour créer une nouvelle équipe.
    """
    headers = _get_headers()
    team_dict = to_dict(team)
    url = f"{TEAM_API_URL}"
    response = await session.post(url, json=team_dict, headers=headers)
    log_event(action="create_team", level="info", name=team.raw_name, club_id=team.club_id)
    return response


@handle_api_response(response_type=Team)
async def update_team(
    session: aiohttp.ClientSession,
    team: Team,
    changes_list: list[str] = []
) -> Team:
    """
    Envoie une requête PUT pour mettre à jour une équipe existante.
    """
    headers = _get_headers()
    team_dict = to_dict(team)
    url = f"{TEAM_API_URL}/{team.id}"
    response = await session.put(url, json=team_dict, headers=headers)
    log_event(
        action="update_team",
        level="info",
        name=team.raw_name,
        changes_list=changes_list
    )
    return response


@handle_api_response(response_type=list[Team])
async def get_teams(
    session: aiohttp.ClientSession,
    division_id: Optional[str] = None,
    format: Optional[str] = None,
    gender: Optional[str] = None,
    season: Optional[str] = None,
    club_id: Optional[str] = None,
    raw_name: Optional[str] = None,
    ids: Optional[List[int]] = None
) -> List[Team]:
    """
    Récupère les équipes avec des filtres optionnels : name, division_id, format, gender, club_id, ids.
    """
    headers = _get_headers()
    params = {}

    if raw_name:
        params["raw_name"] = raw_name
    if division_id:
        params["division_id"] = division_id
    if format:
        params["format"] = format
    if gender:
        params["gender"] = gender
    if season:
        params["season"] = season
    if club_id:
        params["club_id"] = club_id
    if ids:
        params["ids"] = ",".join(map(str, ids))

    url = f"{TEAM_API_URL}"
    return await session.get(url, params=params, headers=headers)