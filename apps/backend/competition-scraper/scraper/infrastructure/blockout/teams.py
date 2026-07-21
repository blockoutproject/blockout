import aiohttp
import json
from dataclasses import asdict, fields

from scraper.config.settings import TEAM_API_URL
from scraper.infrastructure.blockout.auth import _get_headers
from scraper.infrastructure.blockout.response import handle_api_response
from scraper.infrastructure.blockout.team import (
    CreateTeamInternalRequest,
    TeamInternalResponse,
    UpdateTeamInternalRequest,
)
from scraper.observability.logging import log_event

TEAM_CREATE_WRITE_FIELDS = tuple(
    field.name for field in fields(CreateTeamInternalRequest)
)
TEAM_UPDATE_WRITE_FIELDS = tuple(
    field.name for field in fields(UpdateTeamInternalRequest)
)


def _to_team_create_payload(team: TeamInternalResponse) -> dict:
    request = CreateTeamInternalRequest(
        **{field: getattr(team, field) for field in TEAM_CREATE_WRITE_FIELDS}
    )
    return asdict(request)


def _to_team_update_payload(team: TeamInternalResponse) -> dict:
    request = UpdateTeamInternalRequest(
        **{field: getattr(team, field) for field in TEAM_UPDATE_WRITE_FIELDS}
    )
    return asdict(request)


@handle_api_response(response_type=TeamInternalResponse)
async def create_team(
    session: aiohttp.ClientSession, team: TeamInternalResponse
) -> TeamInternalResponse:
    """
    Envoie une requête POST pour créer une nouvelle équipe.
    """
    headers = _get_headers()
    team_dict = _to_team_create_payload(team)
    url = f"{TEAM_API_URL}"
    response = await session.post(url, json=team_dict, headers=headers)
    log_event(
        action="create_team", level="info", rawName=team.rawName, clubId=team.clubId
    )
    return response


@handle_api_response(response_type=TeamInternalResponse)
async def update_team(
    session: aiohttp.ClientSession,
    team: TeamInternalResponse,
    changes_list: list[str] = [],
) -> TeamInternalResponse:
    """
    Envoie une requête PUT pour mettre à jour une équipe existante.
    """
    headers = _get_headers()
    data = aiohttp.FormData()

    team_dict = _to_team_update_payload(team)
    data.add_field("data", json.dumps(team_dict), content_type="application/json")

    url = f"{TEAM_API_URL}/{team.id}"
    response = await session.put(url, data=data, headers=headers)
    log_event(
        action="update_team",
        level="info",
        rawName=team.rawName,
        changes_list=changes_list,
    )
    return response


@handle_api_response(response_type=list[TeamInternalResponse])
async def get_teams(
    session: aiohttp.ClientSession,
    divisionId: int | None = None,
    format: str | None = None,
    gender: str | None = None,
    season: str | None = None,
    clubId: str | None = None,
    rawName: str | None = None,
    ids: list[int] | None = None,
) -> list[TeamInternalResponse]:
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
