from typing import Optional
import aiohttp
from config.env_config import TEAM_API_URL
from config.logger_config import log_event
from utils.handlers.error_handler import handle_errors
from utils.handlers.api_handler import handle_api_response
from models.team import Team

@handle_errors
@handle_api_response(response_type=Team)
async def get_team_by_pool_and_name(session: aiohttp.ClientSession, pool_id: int, team_name: str) -> Optional[Team]:
    """
    Vérifie si une équipe existe déjà via l'API en utilisant pool_id et team_name.
    """
    log_event(
        action="get_team_by_pool_and_name",
        level="info",
        pool_id=pool_id,
        team_name=team_name,
        message="Recherche d'une équipe par pool et nom."
    )
    params = {'pool_id': pool_id, 'team_name': team_name}
    return await session.get(f"{TEAM_API_URL}/search", params=params)


@handle_errors
@handle_api_response(response_type=Team)
async def create_team(session: aiohttp.ClientSession, team: Team) -> Team:
    """
    Envoie une requête POST pour créer une nouvelle équipe.
    """
    team_dict = team.to_dict()
    log_event(
        action="create_team",
        level="info",
        team_name=team.team_name,
        club_id=team.club_id,
        message="Création d'une nouvelle équipe."
    )
    response = await session.post(TEAM_API_URL, json=team_dict)
    log_event(
        action="team_created",
        level="success",
        team_name=team.team_name,
        club_id=team.club_id
    )
    return response


@handle_errors
@handle_api_response(response_type=Team)
async def update_team(session: aiohttp.ClientSession, team: Team, changes: list[str] = []) -> Team:
    """
    Envoie une requête PUT pour mettre à jour une équipe existante.
    """
    team_dict = team.to_dict()
    log_event(
        action="update_team",
        level="info",
        team_name=team.team_name,
        team_id=team.id,
        changes=changes,
        message="Mise à jour d'une équipe existante."
    )
    response = await session.put(f"{TEAM_API_URL}/{team.id}", json=team_dict)
    log_event(
        action="team_updated",
        level="success",
        team_name=team.team_name,
        changes=changes
    )
    return response


@handle_errors
@handle_api_response(response_type=list[Team])
async def get_teams_by_pool(session: aiohttp.ClientSession, pool_id: int) -> list[Team]:
    """
    Récupère toutes les équipes associées à une poule spécifique via une seule requête.
    """
    log_event(
        action="get_teams_by_pool",
        level="info",
        pool_id=pool_id,
        message="Récupération des équipes par pool."
    )
    return await session.get(f"{TEAM_API_URL}/pool/{pool_id}")


@handle_errors
@handle_api_response(response_type=list[Team])
async def get_active_teams_by_pool_id(session: aiohttp.ClientSession, pool_id: int) -> Optional[list[Team]]:
    """
    Récupère les équipes actives pour une pool donnée.
    """
    log_event(
        action="get_active_teams_by_pool_id",
        level="info",
        pool_id=pool_id,
        message="Récupération des équipes actives par pool ID."
    )
    return await session.get(f"{TEAM_API_URL}/active?pool_id={pool_id}")


@handle_errors
@handle_api_response(response_type=None)
async def deactivate_team(session: aiohttp.ClientSession, team_id: int) -> None:
    """
    Désactive une équipe en mettant à jour son statut 'active' à False.
    """
    log_event(
        action="deactivate_team",
        level="info",
        team_id=team_id,
        message="Désactivation d'une équipe."
    )
    await session.put(f"{TEAM_API_URL}/{team_id}/deactivate")
    log_event(
        action="team_deactivated",
        level="success",
        team_id=team_id
    )