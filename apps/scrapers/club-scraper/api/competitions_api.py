from typing import Set

from blockout_contract_clients.competition_service.api.competition_lifecycle_api import CompetitionLifecycleApi
from blockout_contract_clients.competition_service.models.missing_club_ids_internal_request import (
    MissingClubIdsInternalRequest,
)

from api.blockout_client import BlockoutClientSession


async def bulk_deactivate_clubs(
    client: BlockoutClientSession,
    missing_club_ids: Set[str],
) -> None:
    """Deactivate missing clubs through the canonical generated command."""
    command = MissingClubIdsInternalRequest(missing_club_ids=sorted(missing_club_ids))
    await client.invoke(
        CompetitionLifecycleApi(client.api_client).bulk_deactivate_competition_clubs,
        missing_club_ids_internal_request=command,
    )
