from typing import List, Optional

from blockout_contract_clients.clubs_service.api.clubs_api import ClubsApi
from blockout_contract_clients.clubs_service.models.club_internal_response import ClubInternalResponse
from blockout_contract_clients.clubs_service.models.create_club_internal_request import CreateClubInternalRequest
from blockout_contract_clients.clubs_service.models.update_club_internal_request import UpdateClubInternalRequest

from api.blockout_client import BlockoutClientSession
from models.club import Club


PAGE_SIZE = 100


async def get_all_clubs(client: BlockoutClientSession) -> List[Club]:
    """Load every club page into scraper-owned models."""
    api = ClubsApi(client.api_client)
    clubs: List[Club] = []
    page = 0
    while True:
        response = await client.invoke(api.list_clubs, page=page, page_size=PAGE_SIZE)
        clubs.extend(_to_club(item) for item in response.items)
        if not response.page_info.has_next:
            return clubs
        page += 1


async def create_club(
    client: BlockoutClientSession,
    club: Club,
    image_path: Optional[str] = None,
) -> Club:
    """Create a club through the canonical generated multipart operation."""
    data = CreateClubInternalRequest(
        id=club.id,
        raw_name=club.raw_name,
        name=club.name,
        city=club.city,
        postal_code=club.postal_code,
        email=club.email,
        phone_number=club.phone_number,
        website=club.website,
    )
    response = await client.invoke(
        ClubsApi(client.api_client).create_club,
        data=data,
        image=image_path,
    )
    return _to_club(response)


async def update_club(
    client: BlockoutClientSession,
    club: Club,
) -> Club:
    """Update a club through the canonical generated multipart operation."""
    data = UpdateClubInternalRequest(
        raw_name=club.raw_name,
        name=club.name,
        address=club.address,
        city=club.city,
        postal_code=club.postal_code,
        email=club.email,
        phone_number=club.phone_number,
        website=club.website,
        remove_logo=False,
    )
    response = await client.invoke(
        ClubsApi(client.api_client).update_club,
        id=club.id,
        data=data,
    )
    return _to_club(response)


def _to_club(response: ClubInternalResponse) -> Club:
    return Club(
        id=response.id,
        raw_name=response.raw_name,
        name=response.name,
        address=response.address,
        city=response.city,
        postal_code=response.postal_code,
        email=response.email,
        phone_number=response.phone_number,
        website=response.website,
        logo_url=response.logo_url,
        active=response.active,
    )
