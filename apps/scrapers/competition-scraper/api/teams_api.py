from typing import List, Optional

from blockout_contract_clients.teams_service.api.teams_api import TeamsApi
from blockout_contract_clients.teams_service.models.create_team_internal_request import CreateTeamInternalRequest
from blockout_contract_clients.teams_service.models.team_internal_response import TeamInternalResponse
from blockout_contract_clients.teams_service.models.update_team_internal_request import UpdateTeamInternalRequest

from api.blockout_client import BlockoutClientSession
from config.logger_config import log_event
from models.team import Team


PAGE_SIZE = 100


async def create_team(client: BlockoutClientSession, team: Team) -> Team:
    """Create a team through the canonical generated model."""
    response = await client.invoke(
        TeamsApi(client.api_client).create_team,
        create_team_internal_request=CreateTeamInternalRequest(**_team_fields(team)),
    )
    log_event(action="create_team", level="info", raw_name=team.raw_name, club_id=team.club_id)
    return _to_team(response)


async def update_team(
    client: BlockoutClientSession,
    team: Team,
    changes_list: List[str] | None = None,
) -> Team:
    """Update a team through the canonical generated multipart operation."""
    if team.id is None:
        raise ValueError("A team ID is required for update.")
    response = await client.invoke(
        TeamsApi(client.api_client).update_team,
        id=team.id,
        data=UpdateTeamInternalRequest(
            **_team_fields(team),
            active=team.active,
            remove_logo=False,
        ),
    )
    log_event(
        action="update_team",
        level="info",
        raw_name=team.raw_name,
        changes_list=changes_list or [],
    )
    return _to_team(response)


async def get_teams(
    client: BlockoutClientSession,
    division_id: Optional[str] = None,
    format: Optional[str] = None,
    gender: Optional[str] = None,
    season: Optional[str] = None,
    club_id: Optional[str] = None,
    raw_name: Optional[str] = None,
    ids: Optional[List[int]] = None,
) -> List[Team]:
    """Load every canonical team page and preserve the legacy local raw-name filter."""
    api = TeamsApi(client.api_client)
    teams: List[Team] = []
    page = 0
    while True:
        response = await client.invoke(
            api.list_teams,
            division_id=int(division_id) if division_id is not None else None,
            format=format,
            gender=gender,
            season=season,
            club_id=club_id,
            ids=ids,
            page=page,
            page_size=PAGE_SIZE,
        )
        teams.extend(_to_team(item) for item in response.items)
        if not response.page_info.has_next:
            break
        page += 1
    if raw_name is None:
        return teams
    normalized = raw_name.strip().lower()
    return [team for team in teams if team.raw_name.strip().lower() == normalized]


def _team_fields(team: Team) -> dict[str, object]:
    if team.format is None or team.gender is None:
        raise ValueError("Team format and gender are required by the canonical contract.")
    return {
        "club_id": team.club_id,
        "raw_name": team.raw_name,
        "name": team.name,
        "short_name": team.short_name,
        "league_code": team.league_code,
        "division_id": int(team.division_id),
        "season": team.season,
        "format": team.format,
        "gender": team.gender,
    }


def _to_team(response: TeamInternalResponse) -> Team:
    return Team(
        id=response.id,
        club_id=response.club_id,
        raw_name=response.raw_name,
        name=response.name,
        short_name=response.short_name,
        league_code=response.league_code,
        division_id=str(response.division_id),
        season=response.season,
        format=response.format.value,
        gender=response.gender.value,
        followers_count=response.followers_count,
        active=response.active,
    )
