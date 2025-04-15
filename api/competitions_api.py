from typing import Optional
import aiohttp
from config.env_config import COMPETITION_API_URL
from config.logger_config import log_event
from models.competition_association import CompetitionAssociation
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_auth_headers
from utils.utils import to_dict



@handle_api_response(response_type=None)
async def bulk_deactivate_clubs(session: aiohttp.ClientSession, missing_club_ids: list[int]) -> None:
    """
    Envoie une requête PUT pour désactiver en masse les clubs non présents dans la liste scrapée.
    """
    headers = _get_auth_headers()
    body = {
        "missing_club_ids": missing_club_ids
    }
    url = f"{COMPETITION_API_URL}/clubs/bulk-deactivate"

    response = await session.put(url, json=body, headers=headers)

    log_event(
        action="bulk_deactivate_clubs",
        level="info",
        message=f"[club_api] - Désactivation en masse de {len(missing_club_ids)} clubs"
    )

    return response