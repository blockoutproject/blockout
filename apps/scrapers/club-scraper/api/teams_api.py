from typing import List

from blockout_contract_clients.teams_service.api.team_club_discovery_api import TeamClubDiscoveryApi

from api.blockout_client import BlockoutClientSession


PAGE_SIZE = 100


async def get_unique_club_ids(client: BlockoutClientSession) -> List[str]:
    """Load every canonical team club-ID page."""
    api = TeamClubDiscoveryApi(client.api_client)
    club_ids: List[str] = []
    page = 0
    while True:
        response = await client.invoke(api.list_team_club_ids, page=page, page_size=PAGE_SIZE)
        club_ids.extend(response.items)
        if not response.page_info.has_next:
            return club_ids
        page += 1
