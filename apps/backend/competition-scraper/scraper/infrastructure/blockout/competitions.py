"""Generated competition-service client adapter."""

from collections.abc import Awaitable

from blockout_contract_clients.competition.api.competition_association_api import (
    CompetitionAssociationApi,
)
from blockout_contract_clients.competition.api_client import ApiClient
from blockout_contract_clients.competition.configuration import Configuration
from blockout_contract_clients.competition.exceptions import ApiException
from blockout_contract_clients.competition.models.bulk_deactivate_pools_internal_request import (
    BulkDeactivatePoolsInternalRequest,
)
from blockout_contract_clients.competition.models.bulk_deactivate_teams_internal_request import (
    BulkDeactivateTeamsInternalRequest,
)
from blockout_contract_clients.competition.models.competition_association_internal_response import (
    CompetitionAssociationInternalResponse,
)
from blockout_contract_clients.competition.models.update_association_stats_internal_request import (
    UpdateAssociationStatsInternalRequest as GeneratedAssociationStats,
)

from scraper.config.settings import COMPETITION_API_URL
from scraper.domain.models import AssociationStats, CompetitionAssociation
from scraper.infrastructure.blockout.auth import _get_headers

_COMPETITION_API_PATH = "/api/v1/competitions"


def build_competition_api_client() -> ApiClient:
    """Configure the generated HTTPX client from the existing service URL."""
    if not COMPETITION_API_URL or not COMPETITION_API_URL.endswith(
        _COMPETITION_API_PATH
    ):
        raise ValueError(
            f"COMPETITION_API_URL must end with '{_COMPETITION_API_PATH}'."
        )
    return ApiClient(
        Configuration(
            host=COMPETITION_API_URL.removesuffix(_COMPETITION_API_PATH),
            verify_ssl=False,
        )
    )


async def get_active_team_associations_by_pool(
    api: CompetitionAssociationApi, pool_id: int
) -> list[CompetitionAssociation]:
    responses = await _call(
        api.list_pool_teams(pool_id, _headers=_get_headers(), _request_timeout=10)
    )
    return [_to_association(item) for item in responses]


async def add_team_to_pool(
    api: CompetitionAssociationApi, pool_id: int, team_id: int, club_id: str
) -> CompetitionAssociation:
    response = await _call(
        api.add_team_to_pool(
            pool_id, team_id, club_id, _headers=_get_headers(), _request_timeout=10
        )
    )
    return _to_association(response)


async def bulk_deactivate_teams_by_pool(
    api: CompetitionAssociationApi, pool_id: int, missing_team_ids: set[int]
) -> None:
    await _call(
        api.bulk_deactivate_teams(
            pool_id,
            BulkDeactivateTeamsInternalRequest(list(missing_team_ids)),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )


async def bulk_deactivate_pools(
    api: CompetitionAssociationApi, missing_pool_ids: set[int]
) -> None:
    await _call(
        api.bulk_deactivate_pools(
            BulkDeactivatePoolsInternalRequest(list(missing_pool_ids)),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )


async def update_team_association_stats(
    api: CompetitionAssociationApi,
    pool_id: int,
    team_id: int,
    stats: AssociationStats,
) -> CompetitionAssociation:
    request = GeneratedAssociationStats(
        played=stats.played,
        wins=stats.wins,
        losses=stats.losses,
        points=stats.points,
        wins_three_to_zero=stats.wins_three_to_zero,
        wins_three_to_one=stats.wins_three_to_one,
        wins_three_to_two=stats.wins_three_to_two,
        losses_zero_to_three=stats.losses_zero_to_three,
        losses_one_to_three=stats.losses_one_to_three,
        losses_two_to_three=stats.losses_two_to_three,
        won_sets=stats.won_sets,
        lost_sets=stats.lost_sets,
        won_points=stats.won_points,
        lost_points=stats.lost_points,
        points_penalty=stats.points_penalty,
        coef_sets=stats.coefficient_sets,
        coef_points=stats.coefficient_points,
    )
    response = await _call(
        api.update_stats(
            pool_id, team_id, request, _headers=_get_headers(), _request_timeout=10
        )
    )
    return _to_association(response)


def _to_association(
    response: CompetitionAssociationInternalResponse,
) -> CompetitionAssociation:
    return CompetitionAssociation(
        id=response.id,
        pool_id=response.pool_id,
        team_id=response.team_id,
        club_id=response.club_id,
        active=response.active,
        points=response.points or 0,
        played=response.played or 0,
        wins=response.wins or 0,
        losses=response.losses or 0,
        wins_three_to_zero=response.wins_three_to_zero or 0,
        wins_three_to_one=response.wins_three_to_one or 0,
        wins_three_to_two=response.wins_three_to_two or 0,
        losses_zero_to_three=response.losses_zero_to_three or 0,
        losses_one_to_three=response.losses_one_to_three or 0,
        losses_two_to_three=response.losses_two_to_three or 0,
        won_sets=response.won_sets or 0,
        lost_sets=response.lost_sets or 0,
        won_points=response.won_points or 0,
        lost_points=response.lost_points or 0,
        points_penalty=response.points_penalty or 0,
        coefficient_sets=response.coef_sets or 0.0,
        coefficient_points=response.coef_points or 0.0,
        created_at=response.created_at,
        last_update=response.last_update,
    )


async def _call[T](request: Awaitable[T]) -> T:
    try:
        return await request
    except ApiException as error:
        detail = error.body or error.reason or "Unknown error"
        raise RuntimeError(f"Erreur API {error.status}: {detail}") from error
