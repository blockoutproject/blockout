from typing import Set
import aiohttp
from config.env_config import COMPETITION_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_auth_headers


@handle_api_response(response_type=None)
async def bulk_deactivate_clubs(
    session: aiohttp.ClientSession,
    missing_club_ids: Set[str]
) -> None:
    """
    Désactive en masse les clubs absents de la liste.
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/clubs/bulk-deactivate"
    payload = {"missing_club_ids": list(missing_club_ids)}

    await session.put(url, json=payload, headers=headers)

    log_event(
        action="bulk_deactivate_clubs",
        level="info",
        message=f"PUT {url} - Clubs désactivés : {missing_club_ids}"
    )