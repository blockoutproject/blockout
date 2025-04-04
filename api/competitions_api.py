from typing import Optional
import aiohttp
from config.env_config import COMPETITION_API_URL
from config.logger_config import log_event
from models.association_stats import AssociationStats
from models.category import Category
from models.competition_association import CompetitionAssociation
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_auth_headers
from utils.utils import to_dict


@handle_api_response(response_type=list[CompetitionAssociation])
async def get_active_team_associations_by_pool(session: aiohttp.ClientSession, pool_id: int) -> Optional[list[CompetitionAssociation]]:
    """
    Récupère la liste des associations actives pour une pool donnée.
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/active"
    response = await session.get(url, headers=headers)
    return response

@handle_api_response(response_type=list[CompetitionAssociation])
async def get_team_associations_by_pool(session: aiohttp.ClientSession, pool_id: int) -> Optional[list[CompetitionAssociation]]:
    """
    Récupère la liste de toutes les associations pour une pool donnée.
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams"
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
async def bulk_deactivate_teams_by_pool(session: aiohttp.ClientSession, pool_id: int, missing_team_ids: list[int]) -> None:
    """
    Désactive en masse les associations Pool–Team qui figurent dans la liste 'missing_team_ids'.
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/bulk-deactivate"
    payload = {
        "missing_team_ids": list(missing_team_ids)
    }

    response = await session.put(url, json=payload, headers=headers)
    return response

@handle_api_response(response_type=None)
async def bulk_deactivate_pools(session: aiohttp.ClientSession, missing_pool_ids: list[int]) -> None:
    """
    Désactive en masse les associations pool_id qui ne figurent plus dans la liste 'missing_pool_ids'.
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/pools/bulk-deactivate"
    payload = {
        "missing_pool_ids": list(missing_pool_ids)
    }

    response = await session.put(url, json=payload, headers=headers)
    log_event(
        action="bulk_deactivate_pools",
        level="info",
        message=f"PUT {url} - Désactivation en masse des pools {missing_pool_ids}."
    )
    return response

@handle_api_response(response_type=CompetitionAssociation)
async def update_team_association_stats(
    session: aiohttp.ClientSession, 
    pool_id: int, 
    team_id: int, 
    stats: AssociationStats
) -> None:
    """
    Met à jour en base (via l'API Competition) les statistiques de l'association (pool_id, team_id).
    """
    headers = _get_auth_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/{team_id}/stats"
    stats_dict = to_dict(stats)

    response = await session.put(url, json=stats_dict, headers=headers)
    
    log_event(
        action="update_team_association_stats",
        level="info",
        pool_id=pool_id,
        team_id=team_id,
        message=f"PUT {url} - Update team association stats."
    )
    return response