"""Generated teams-service client adapter."""

from collections.abc import Awaitable

from blockout_contract_clients.team.api.team_api import TeamApi
from blockout_contract_clients.team.api_client import ApiClient
from blockout_contract_clients.team.configuration import Configuration
from blockout_contract_clients.team.exceptions import ApiException
from blockout_contract_clients.team.models.create_team_internal_request import (
    CreateTeamInternalRequest,
)
from blockout_contract_clients.team.models.format_enum import FormatEnum
from blockout_contract_clients.team.models.gender_enum import GenderEnum
from blockout_contract_clients.team.models.team_internal_response import (
    TeamInternalResponse,
)
from blockout_contract_clients.team.models.update_team_internal_request import (
    UpdateTeamInternalRequest,
)

from scraper.config.settings import TEAM_API_URL
from scraper.domain.models import Team
from scraper.infrastructure.blockout.auth import _get_headers
from scraper.observability.logging import log_event

_TEAM_API_PATH = "/api/v1/teams"


def build_team_api_client() -> ApiClient:
    """Configure the generated HTTPX client from the existing service URL."""
    if not TEAM_API_URL or not TEAM_API_URL.endswith(_TEAM_API_PATH):
        raise ValueError(f"TEAM_API_URL must end with '{_TEAM_API_PATH}'.")
    return ApiClient(
        Configuration(
            host=TEAM_API_URL.removesuffix(_TEAM_API_PATH),
            connection_pool_maxsize=20,
            verify_ssl=False,
        )
    )


async def create_team(api: TeamApi, team: Team) -> Team:
    """Create one Team through the generated client."""
    response = await _team_call(
        api.create_team(
            CreateTeamInternalRequest(
                club_id=team.club_id,
                raw_name=team.raw_name,
                name=team.name,
                short_name=team.short_name,
                league_code=team.league_code,
                division_id=team.division_id,
                season=team.season,
                format=FormatEnum(team.format),
                gender=GenderEnum(team.gender),
                followers_count=team.followers_count,
                logo_url=team.logo_url,
                active=team.active,
            ),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    log_event(
        action="create_team",
        level="info",
        teamId=response.id,
        clubId=team.club_id,
    )
    return _to_team(response)


async def update_team(
    api: TeamApi,
    team: Team,
    changes_list: list[str] | None = None,
) -> Team:
    """Update one Team through the generated multipart route."""
    if team.id is None:
        raise ValueError("A Team identifier is required for update.")
    request = UpdateTeamInternalRequest(
        club_id=team.club_id,
        raw_name=team.raw_name,
        name=team.name,
        short_name=team.short_name,
        league_code=team.league_code,
        division_id=team.division_id,
        logo_url=team.logo_url,
        season=team.season,
        format=FormatEnum(team.format) if team.format else None,
        gender=GenderEnum(team.gender) if team.gender else None,
        active=team.active,
    )
    response = await _team_call(
        api.update_team(
            team.id,
            request.to_json(),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    log_event(
        action="update_team",
        level="info",
        teamId=team.id,
        changes_list=changes_list or [],
    )
    return _to_team(response)


async def get_teams(
    api: TeamApi,
    division_id: int | None = None,
    format: str | None = None,
    gender: str | None = None,
    season: str | None = None,
    club_id: str | None = None,
    ids: list[int] | None = None,
) -> list[Team]:
    """List Teams using the owner service's optional filters."""
    responses = await _team_call(
        api.list_teams(
            division_id=division_id,
            format=FormatEnum(format) if format else None,
            gender=GenderEnum(gender) if gender else None,
            season=season,
            club_id=club_id,
            ids=ids,
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    return [_to_team(response) for response in responses]


def _to_team(response: TeamInternalResponse) -> Team:
    return Team(
        id=response.id,
        club_id=response.club_id,
        raw_name=response.raw_name,
        name=response.name,
        short_name=response.short_name,
        league_code=response.league_code,
        division_id=response.division_id,
        season=response.season,
        format=response.format.value,
        gender=response.gender.value,
        followers_count=response.followers_count,
        logo_url=response.logo_url,
        active=response.active,
        created_at=response.created_at,
        last_update=response.last_update,
    )


async def _team_call[T](request: Awaitable[T]) -> T:
    try:
        return await request
    except ApiException as error:
        detail = error.body or error.reason or "Unknown error"
        raise RuntimeError(f"Erreur API {error.status}: {detail}") from error
