import json
from typing import List, Optional
import aiohttp
from config.env_config import CLUB_API_URL
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers
from models.club import Club


def _create_payload(club: Club) -> dict:
    return {
        "id": club.id,
        "rawName": club.rawName,
        "name": club.name,
        "address": club.address,
        "city": club.city,
        "postalCode": club.postalCode,
        "email": club.email,
        "phoneNumber": club.phoneNumber,
        "website": club.website,
        "logoUrl": club.logoUrl,
    }


def _update_payload(club: Club) -> dict:
    payload = _create_payload(club)
    payload.pop("id")
    return payload


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
    club_dict = _create_payload(club)
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

    club_dict = _update_payload(club)
    data.add_field("data", json.dumps(club_dict), content_type="application/json")
    
    headers = _get_headers()
    response = await session.put(url, data=data, headers=headers)
    return response
