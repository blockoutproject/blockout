from typing import Optional, List
import aiohttp
from config.env_config import CLUB_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_auth_headers
from utils.utils import to_dict
from models.club import Club


@handle_api_response(response_type=List[Club])
async def get_all_clubs(session: aiohttp.ClientSession) -> List[Club]:
    """
    Récupère tous les clubs.
    """
    headers = _get_auth_headers()
    return await session.get(f"{CLUB_API_URL}/clubs", headers=headers)


@handle_api_response(response_type=Club)
async def create_club(session: aiohttp.ClientSession, club: Club) -> Club:
    """
    Envoie une requête POST pour créer un club.
    """
    headers = _get_auth_headers()
    response = await session.post(
        f"{CLUB_API_URL}/clubs",
        json=to_dict(club),
        headers=headers
    )
    return response


@handle_api_response(response_type=Club)
async def update_club(
    session: aiohttp.ClientSession,
    club: Club,
    changes_list: list[str] = []
) -> Club:
    """
    Envoie une requête PUT pour mettre à jour un club existant.
    """
    headers = _get_auth_headers()
    url = f"{CLUB_API_URL}/clubs/{club.id}"
    response = await session.put(url, json=to_dict(club), headers=headers)
    return response