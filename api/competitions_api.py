from typing import Optional
import aiohttp
from config.env_config import COMPETITION_API_URL
from config.logger_config import log_event
from models.category import Category
from models.competition_association import CompetitionAssociation
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_auth_headers


@handle_api_response(response_type=list[CompetitionAssociation])
async def get_active_team_associations_by_pool(session: aiohttp.ClientSession, pool_id: int) -> Optional[list[CompetitionAssociation]]:
    """
    Récupère la liste des associations 'Pool–Team' actives (côté Competition) pour une pool donnée.
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/active"
    response = await session.get(url, headers=headers)
    return response

@handle_api_response(response_type=CompetitionAssociation)
async def add_team_to_pool(session: aiohttp.ClientSession, category: Category, pool_id: int, team_id: int) -> CompetitionAssociation:
    """
    Créer (ou réactiver) l'association entre une poule et une équipe.
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/{team_id}?category={category.value}"

    response = await session.post(url, headers=headers)
    
    log_event(
        action="add_team_to_pool",
        level="info",
        category=category.value,
        pool_id=pool_id,
        team_id=team_id,
        message=f"POST {url} - Association pool/team."
    )
    return response

@handle_api_response(response_type=None)
async def bulk_deactivate_teams_by_pool(session: aiohttp.ClientSession, pool_id: int, scraped_team_ids: list[int]) -> None:
    """
    Désactive en masse les associations Pool–Team qui ne figurent plus dans la liste 'scraped_team_ids'.
    """
    headers = _get_auth_headers()
    payload = {
        "scraped_team_ids": list(scraped_team_ids)
    }

    response = await session.put(f"{COMPETITION_API_URL}/pools/{pool_id}/teams/bulk-deactivate", json=payload, headers=headers)
    return response

@handle_api_response(response_type=None)
async def bulk_deactivate_pools(session: aiohttp.ClientSession, scraped_pool_ids: list[int]) -> None:
    """
    Désactive en masse les associations pool_id qui ne figurent plus dans la liste 'scraped_pool_ids'.
    """
    headers = _get_auth_headers()
    payload = {
        "scraped_pool_ids": list(scraped_pool_ids)
    }

    response = await session.put(f"{COMPETITION_API_URL}/pools/bulk-deactivate", json=payload, headers=headers)
    return response