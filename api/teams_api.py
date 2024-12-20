from typing import Optional
import aiohttp
from config.env_config import TEAM_API_URL
from config.logger_config import log_event
from utils.handlers.api_handler import handle_api_response
from models.team import Team
from api.auth0 import _get_auth_headers


@handle_api_response(response_type=Team)
async def get_team_by_pool_and_name(session: aiohttp.ClientSession, pool_id: int, team_name: str) -> Optional[Team]:
    """
    Vérifie si une équipe existe déjà via l'API en utilisant pool_id et team_name.
    """
    headers = _get_auth_headers()
    params = {'team_name': team_name}
    return await session.get(f"{TEAM_API_URL}/pools/{pool_id}/teams/search", params=params, headers=headers)


@handle_api_response(response_type=Team)
async def create_team(session: aiohttp.ClientSession, team: Team) -> Team:
    """
    Envoie une requête POST pour créer une nouvelle équipe.
    """
    headers = _get_auth_headers()
    team_dict = team.to_dict()
    response = await session.post(f"{TEAM_API_URL}/teams", json=team_dict, headers=headers)
    log_event(
        action="create_team",
        level="info",
        team_name=team.team_name,
        club_id=team.club_id
    )
    return response


@handle_api_response(response_type=Team)
async def update_team(session: aiohttp.ClientSession, team: Team, changes: list[str] = []) -> Team:
    """
    Envoie une requête PUT pour mettre à jour une équipe existante.
    """
    headers = _get_auth_headers()
    team_dict = team.to_dict()
    response = await session.put(f"{TEAM_API_URL}/teams/{team.id}", json=team_dict, headers=headers)
    log_event(
        action="update_team",
        level="info",
        team_name=team.team_name,
        changes=changes
    )
    return response


@handle_api_response(response_type=list[Team])
async def get_teams_by_pool(session: aiohttp.ClientSession, pool_id: int) -> list[Team]:
    """
    Récupère toutes les équipes associées à une poule spécifique via une seule requête.
    """
    headers = _get_auth_headers()
    return await session.get(f"{TEAM_API_URL}/pools/{pool_id}/teams", headers=headers)


@handle_api_response(response_type=list[Team])
async def get_active_teams_by_pool_id(session: aiohttp.ClientSession, pool_id: int) -> Optional[list[Team]]:
    """
    Récupère les équipes actives pour une pool donnée.
    """
    headers = _get_auth_headers()
    return await session.get(f"{TEAM_API_URL}/pools/{pool_id}/teams/active", headers=headers)


@handle_api_response(response_type=None)
async def deactivate_team(session: aiohttp.ClientSession, team_id: int) -> None:
    """
    Désactive une équipe en mettant à jour son statut 'active' à False.
    """
    headers = _get_auth_headers()
    response = await session.put(f"{TEAM_API_URL}/teams/{team_id}/deactivate", headers=headers)
    log_event(
        action="deactivate_team",
        level="info",
        team_id=team_id
    )
    return response