from typing import List
import aiohttp
from config.env_config import TEAM_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.team import Team
from api.auth0 import _get_auth_headers
from utils.utils import to_dict


@handle_api_response(response_type=Team)
async def create_team(session: aiohttp.ClientSession, team: Team) -> Team:
    """
    Envoie une requête POST pour créer une nouvelle équipe.
    """
    headers = _get_auth_headers()
    team_dict = to_dict(team)
    url = f"{TEAM_API_URL}"
    response = await session.post(url, json=team_dict, headers=headers)
    log_event(action="create_team", level="info", name=team.name, club_id=team.club_id)
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
    headers = _get_auth_headers()
    team_dict = to_dict(team)
    url = f"{TEAM_API_URL}/{team.id}"
    response = await session.put(url, json=team_dict, headers=headers)
    log_event(
        action="update_team",
        level="info",
        name=team.name,
        changes_list=changes_list
    )
    return response


@handle_api_response(response_type=list[Team])
async def get_teams_by_division_format_gender(
    session: aiohttp.ClientSession,
    division_name: str,
    format: str,
    gender: str
) -> List[Team]:
    """
    Récupère les équipes par division_name, format et gender.
    """
    headers = _get_auth_headers()
    params = {
        "divisionName": division_name,
        "format": format,
        "gender": gender
    }
    url = f"{TEAM_API_URL}"
    return await session.get(url, params=params, headers=headers)