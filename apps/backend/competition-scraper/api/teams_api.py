import json
from typing import List, Optional
import aiohttp
from config.env_config import TEAM_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.team import Team
from api.auth0 import _get_headers


TEAM_WRITE_FIELDS = (
    "clubId",
    "rawName",
    "name",
    "shortName",
    "leagueCode",
    "divisionId",
    "season",
    "format",
    "gender",
    "logoUrl",
    "active",
)


def _to_team_write_payload(team: Team) -> dict:
    """Serialize only fields accepted by the handwritten Team write boundary."""
    return {field: getattr(team, field) for field in TEAM_WRITE_FIELDS}


@handle_api_response(response_type=Team)
async def create_team(session: aiohttp.ClientSession, team: Team) -> Team:
    """
    Envoie une requête POST pour créer une nouvelle équipe.
    """
    headers = _get_headers()
    team_dict = _to_team_write_payload(team)
    url = f"{TEAM_API_URL}"
    response = await session.post(url, json=team_dict, headers=headers)
    log_event(action="create_team", level="info", rawName=team.rawName, clubId=team.clubId)
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
    data = aiohttp.FormData()

    team_dict = _to_team_write_payload(team)
    data.add_field("data", json.dumps(team_dict), content_type="application/json")

    url = f"{TEAM_API_URL}/{team.id}"
    response = await session.put(url, data=data, headers=headers)
    log_event(
        action="update_team",
        level="info",
        rawName=team.rawName,
        changes_list=changes_list
    )
    return response


@handle_api_response(response_type=list[Team])
async def get_teams(
    session: aiohttp.ClientSession,
    divisionId: Optional[int] = None,
    format: Optional[str] = None,
    gender: Optional[str] = None,
    season: Optional[str] = None,
    clubId: Optional[str] = None,
    rawName: Optional[str] = None,
    ids: Optional[List[int]] = None
) -> List[Team]:
    """
    Récupère les équipes avec des filtres optionnels : divisionId, format, gender, clubId, ids.
    """
    headers = _get_headers()
    params = {}

    if rawName:
        params["rawName"] = rawName
    if divisionId:
        params["divisionId"] = divisionId
    if format:
        params["format"] = format
    if gender:
        params["gender"] = gender
    if season:
        params["season"] = season
    if clubId:
        params["clubId"] = clubId
    if ids:
        params["ids"] = ",".join(map(str, ids))

    url = f"{TEAM_API_URL}"
    return await session.get(url, params=params, headers=headers)
