from typing import Optional, List
import aiohttp
from config.env_config import COMPETITION_API_URL
from models.association_stats import AssociationStats
from models.competition_association import CompetitionAssociation
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers
from utils.utils import to_dict


@handle_api_response(response_type=list[CompetitionAssociation])
async def get_active_team_associations_by_pool(
    session: aiohttp.ClientSession,
    pool_id: int
) -> Optional[List[CompetitionAssociation]]:
    """
    Récupère la liste des associations actives pour une poule donnée.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams"
    response = await session.get(url, headers=headers)
    return response


@handle_api_response(response_type=CompetitionAssociation)
async def add_team_to_pool(
    session: aiohttp.ClientSession,
    pool_id: int,
    team_id: int,
    club_id: str
) -> CompetitionAssociation:
    """
    Crée ou réactive l'association entre une poule et une équipe.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/{team_id}"
    params = { "club_id": club_id }
    response = await session.post(url, params=params, headers=headers)
    return response


@handle_api_response(response_type=None)
async def bulk_deactivate_teams_by_pool(
    session: aiohttp.ClientSession,
    pool_id: int,
    missing_team_ids: set[int]
) -> None:
    """
    Désactive en masse les associations poule–équipe absentes de la liste.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/bulk-deactivate"
    payload = {"missing_team_ids": list(missing_team_ids)}
    response = await session.put(url, json=payload, headers=headers)
    return response


@handle_api_response(response_type=None)
async def bulk_deactivate_pools(
    session: aiohttp.ClientSession,
    missing_pool_ids: set[int]
) -> None:
    """
    Désactive en masse les poules absentes de la liste.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/bulk-deactivate"
    payload = {"missing_pool_ids": list(missing_pool_ids)}
    response = await session.put(url, json=payload, headers=headers)
    return response


@handle_api_response(response_type=CompetitionAssociation)
async def update_team_association_stats(
    session: aiohttp.ClientSession,
    pool_id: int,
    team_id: int,
    stats: AssociationStats
) -> CompetitionAssociation:
    """
    Met à jour les statistiques de l'association (poule–équipe).
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{pool_id}/teams/{team_id}/stats"
    response = await session.put(url, json=to_dict(stats), headers=headers)
    return response