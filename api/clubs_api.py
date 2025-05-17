from typing import List
import aiohttp
from config.env_config import CLUB_API_URL
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers
from utils.utils import to_dict
from models.club import Club


@handle_api_response(response_type=List[Club])
async def get_all_clubs(session: aiohttp.ClientSession) -> List[Club]:
    """
    Récupère tous les clubs.
    """
    headers = _get_headers()
    url = f"{CLUB_API_URL}"
    return await session.get(url, headers=headers)


@handle_api_response(response_type=Club)
async def create_club(session: aiohttp.ClientSession, club: Club) -> Club:
    """
    Envoie une requête POST pour créer un club.
    """
    headers = _get_headers()
    url = f"{CLUB_API_URL}"
    club_dict = to_dict(club)
    response = await session.post(url, json=club_dict, headers=headers)
    return response


@handle_api_response(response_type=Club)
async def update_club(
    session: aiohttp.ClientSession,
    club: Club,
) -> Club:
    """
    Envoie une requête PUT pour mettre à jour un club existant.
    """
    headers = _get_headers()
    url = f"{CLUB_API_URL}/{club.id}"
    response = await session.put(url, json=to_dict(club), headers=headers)
    return response