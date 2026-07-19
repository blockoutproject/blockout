from typing import Set
import aiohttp
from config.env_config import COMPETITION_API_URL
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers


@handle_api_response(response_type=None)
async def bulk_deactivate_clubs(
    session: aiohttp.ClientSession,
    missing_club_ids: Set[str]
) -> None:
    """
    Désactive en masse les clubs absents de la liste.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/clubs/bulk-deactivate"
    payload = {"missingClubIds": list(missing_club_ids)}
    await session.put(url, json=payload, headers=headers)
