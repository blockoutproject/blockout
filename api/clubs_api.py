from typing import Optional
import aiohttp
from config.env_config import CLUB_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_auth_headers
from utils.utils import to_dict
from models.club import Club

@handle_api_response(response_type=list[Club])
async def get_all_clubs(session: aiohttp.ClientSession) -> list[Club]:
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
    club_dict = to_dict(club)
    response = await session.post(f"{CLUB_API_URL}/clubs", json=club_dict, headers=headers)

    log_event(
        action="create_club",
        level="info",
        club_id=club.id,
        name=club.name,
        message=f"[club_api + {club.id}] - Création d’un club"
    )
    return response


@handle_api_response(response_type=Club)
async def update_club(session: aiohttp.ClientSession, club: Club, changes_list: list[str] = []) -> Club:
    """
    Envoie une requête PUT pour mettre à jour un club existant.
    """
    headers = _get_auth_headers()
    club_dict = to_dict(club)
    response = await session.put(f"{CLUB_API_URL}/clubs/{club.id}", json=club_dict, headers=headers)

    log_event(
        action="update_club",
        level="info",
        club_id=club.id,
        name=club.name,
        changes_list=changes_list,
        message=f"[club_api + {club.id}] - Mise à jour club avec {len(changes_list)} changement(s)"
    )
    return response