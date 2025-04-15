from typing import Optional
import aiohttp
from config.env_config import TEAM_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.team import Team
from api.auth0 import _get_auth_headers
from utils.utils import to_dict

@handle_api_response(response_type=list[str])
async def get_unique_club_ids(session: aiohttp.ClientSession) -> list[str]:
    """
    Récupère la liste des club IDs uniques présents dans la base de données Teams.
    """
    headers = _get_auth_headers()
    response = await session.get(f"{TEAM_API_URL}/teams/club-ids", headers=headers)
    
    log_event(
        action="get_unique_club_ids",
        level="info",
        message="[team_api + get_unique_club_ids] - Club IDs uniques récupérés"
    )

    return response