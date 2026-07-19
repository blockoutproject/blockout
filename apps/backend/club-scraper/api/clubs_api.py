import json
from typing import List, Optional
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
    url = CLUB_API_URL
    return await session.get(url, headers=headers)


@handle_api_response(response_type=Club)
async def create_club(
    session: aiohttp.ClientSession,
    club: Club,
    image_path: Optional[str] = None,
) -> Club:
    """
    Crée un club via POST /clubs (multipart/form-data).
    """
    url = CLUB_API_URL
    data = aiohttp.FormData()

    # Ajout du champ "data" contenant le JSON sérialisé
    club_dict = to_dict(club)
    data.add_field("data", json.dumps(club_dict), content_type="application/json")

    # Ajout du fichier image si présent
    if image_path:
        with open(image_path, "rb") as f:
            data.add_field("image", f, filename=image_path.split("/")[-1], content_type="image/jpeg")

    headers = _get_headers()
    response = await session.post(url, data=data, headers=headers)
    return response


@handle_api_response(response_type=Club)
async def update_club(
    session: aiohttp.ClientSession,
    club: Club,
) -> Club:
    """
    Met à jour un club existant via PUT /clubs/{id} (multipart/form-data).
    """
    url = f"{CLUB_API_URL}/{club.id}"
    data = aiohttp.FormData()

    club_dict = to_dict(club)
    data.add_field("data", json.dumps(club_dict), content_type="application/json")
    
    headers = _get_headers()
    response = await session.put(url, data=data, headers=headers)
    return response