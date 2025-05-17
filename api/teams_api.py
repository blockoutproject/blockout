from typing import List
import aiohttp
from config.env_config import TEAM_API_URL
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers


@handle_api_response(response_type=List[str])
async def get_unique_club_ids(
    session: aiohttp.ClientSession
) -> List[str]:
    """
    Récupère la liste des club IDs uniques (Teams).
    """
    headers = _get_headers()
    url = f"{TEAM_API_URL}/club-ids"
    response = await session.get(url, headers=headers)
    return response