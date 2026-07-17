from typing import List, Set

from blockout_contract_clients.competition_service.api.competition_associations_api import (
    CompetitionAssociationsApi,
)
from blockout_contract_clients.competition_service.api.competition_lifecycle_api import CompetitionLifecycleApi
from blockout_contract_clients.competition_service.api.competition_statistics_api import CompetitionStatisticsApi
from blockout_contract_clients.competition_service.models.competition_association_internal_response import (
    CompetitionAssociationInternalResponse,
)
from blockout_contract_clients.competition_service.models.competition_statistics_snapshot_internal_request import (
    CompetitionStatisticsSnapshotInternalRequest,
)
from blockout_contract_clients.competition_service.models.missing_pool_ids_internal_request import (
    MissingPoolIdsInternalRequest,
)
from blockout_contract_clients.competition_service.models.missing_team_ids_internal_request import (
    MissingTeamIdsInternalRequest,
)

from api.blockout_client import BlockoutClientSession
from models.association_stats import AssociationStats
from models.competition_association import CompetitionAssociation


PAGE_SIZE = 100


async def get_active_team_associations_by_pool(
    client: BlockoutClientSession,
    pool_id: int,
) -> List[CompetitionAssociation]:
    """Load every canonical association page into scraper-owned models."""
    api = CompetitionAssociationsApi(client.api_client)
    associations: List[CompetitionAssociation] = []
    page = 0
    while True:
        response = await client.invoke(
            api.list_competition_associations_by_pool,
            pool_id=pool_id,
            page=page,
            page_size=PAGE_SIZE,
        )
        associations.extend(_to_competition_association(item) for item in response.items if item.active)
        if not response.page_info.has_next:
            return associations
        page += 1


async def add_team_to_pool(
    client: BlockoutClientSession,
    pool_id: int,
    team_id: int,
    club_id: str,
) -> CompetitionAssociation:
    """Create or reactivate a pool-team association through the generated client."""
    response = await client.invoke(
        CompetitionAssociationsApi(client.api_client).add_or_reactivate_competition_association,
        pool_id=pool_id,
        team_id=team_id,
        club_id=club_id,
    )
    return _to_competition_association(response)


async def bulk_deactivate_teams_by_pool(
    client: BlockoutClientSession,
    pool_id: int,
    missing_team_ids: Set[int],
) -> None:
    """Deactivate missing pool-team associations through the canonical command."""
    command = MissingTeamIdsInternalRequest(missing_team_ids=sorted(missing_team_ids))
    await client.invoke(
        CompetitionLifecycleApi(client.api_client).bulk_deactivate_competition_teams_by_pool,
        pool_id=pool_id,
        missing_team_ids_internal_request=command,
    )


async def bulk_deactivate_pools(
    client: BlockoutClientSession,
    missing_pool_ids: Set[int],
) -> None:
    """Deactivate missing pools through the canonical command."""
    command = MissingPoolIdsInternalRequest(missing_pool_ids=sorted(missing_pool_ids))
    await client.invoke(
        CompetitionLifecycleApi(client.api_client).bulk_deactivate_competition_pools,
        missing_pool_ids_internal_request=command,
    )


async def update_team_association_stats(
    client: BlockoutClientSession,
    pool_id: int,
    team_id: int,
    stats: AssociationStats,
) -> CompetitionAssociation:
    """Replace association statistics through the canonical generated model."""
    command = CompetitionStatisticsSnapshotInternalRequest(
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
        coef_sets=stats.coef_sets,
        coef_points=stats.coef_points,
    )
    response = await client.invoke(
        CompetitionStatisticsApi(client.api_client).replace_competition_statistics,
        pool_id=pool_id,
        team_id=team_id,
        competition_statistics_snapshot_internal_request=command,
    )
    return _to_competition_association(response)


def _to_competition_association(
    response: CompetitionAssociationInternalResponse,
) -> CompetitionAssociation:
    return CompetitionAssociation(
        pool_id=response.pool_id,
        team_id=response.team_id,
        club_id=response.club_id,
        active=response.active,
        points=response.points,
        played=response.played,
        wins=response.wins,
        losses=response.losses,
        wins_three_to_zero=response.wins_three_to_zero,
        wins_three_to_one=response.wins_three_to_one,
        wins_three_to_two=response.wins_three_to_two,
        losses_zero_to_three=response.losses_zero_to_three,
        losses_one_to_three=response.losses_one_to_three,
        losses_two_to_three=response.losses_two_to_three,
        won_sets=response.won_sets,
        lost_sets=response.lost_sets,
        won_points=response.won_points,
        lost_points=response.lost_points,
        points_penalty=response.points_penalty,
        coef_sets=float(response.coef_sets),
        coef_points=float(response.coef_points),
    )
