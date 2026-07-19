from typing import Optional, List
import aiohttp
from config.env_config import COMPETITION_API_URL
from models.association_stats import AssociationStats
from models.competition_association import CompetitionAssociation
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers


ASSOCIATION_STATS_WRITE_FIELDS = (
    "played",
    "wins",
    "losses",
    "points",
    "winsThreeToZero",
    "winsThreeToOne",
    "winsThreeToTwo",
    "lossesZeroToThree",
    "lossesOneToThree",
    "lossesTwoToThree",
    "wonSets",
    "lostSets",
    "wonPoints",
    "lostPoints",
    "pointsPenalty",
    "coefSets",
    "coefPoints",
)


@handle_api_response(response_type=list[CompetitionAssociation])
async def get_active_team_associations_by_pool(
    session: aiohttp.ClientSession,
    poolId: int
) -> Optional[List[CompetitionAssociation]]:
    """
    Récupère la liste des associations actives pour une poule donnée.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{poolId}/teams"
    response = await session.get(url, headers=headers)
    return response


@handle_api_response(response_type=CompetitionAssociation)
async def add_team_to_pool(
    session: aiohttp.ClientSession,
    poolId: int,
    teamId: int,
    clubId: str
) -> CompetitionAssociation:
    """
    Crée ou réactive l'association entre une poule et une équipe.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{poolId}/teams/{teamId}"
    params = {"clubId": clubId}
    response = await session.post(url, params=params, headers=headers)
    return response


@handle_api_response(response_type=None)
async def bulk_deactivate_teams_by_pool(
    session: aiohttp.ClientSession,
    poolId: int,
    missing_team_ids: set[int]
) -> None:
    """
    Désactive en masse les associations poule–équipe absentes de la liste.
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{poolId}/teams/bulk-deactivate"
    payload = {"missingTeamIds": list(missing_team_ids)}
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
    payload = {"missingPoolIds": list(missing_pool_ids)}
    response = await session.put(url, json=payload, headers=headers)
    return response


@handle_api_response(response_type=CompetitionAssociation)
async def update_team_association_stats(
    session: aiohttp.ClientSession,
    poolId: int,
    teamId: int,
    stats: AssociationStats
) -> CompetitionAssociation:
    """
    Met à jour les statistiques de l'association (poule–équipe).
    """
    headers = _get_headers()
    url = f"{COMPETITION_API_URL}/pools/{poolId}/teams/{teamId}/stats"
    payload = {field: getattr(stats, field) for field in ASSOCIATION_STATS_WRITE_FIELDS}
    response = await session.put(url, json=payload, headers=headers)
    return response
