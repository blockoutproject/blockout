import traceback
from typing import Optional
import aiohttp
from api.teams_api import create_team, deactivate_team, get_active_teams_by_pool_id, update_team
from models.team import Team
from config.logger_config import log_event, logger

async def add_or_update_team(session: aiohttp.ClientSession, team: Team, existing_team: Optional[Team]) -> Team:
    """
    Vérifie l'existence d'une équipe et la met à jour ou la crée selon les besoins.
    """
    required_fields = ['pool_id', 'team_name']
    missing_fields = [field for field in required_fields if not getattr(team, field, None)]
    if missing_fields:
        raise ValueError(f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}.")

    if existing_team:
        changes_list = []
        team.id = existing_team.id
        
        for field in ['club_id', 'division_name', 'format', 'gender']:
            if getattr(existing_team, field, None) != getattr(team, field, None):
                changes_list.append(f"{field}: {getattr(existing_team, field)} -> {getattr(team, field)}")

        if not existing_team.active:
            team.active = True
            changes_list.append("Équipe réactivée")
        if changes_list:
            return await update_team(session, team, changes_list)
        return existing_team
    else:
        new_team = await create_team(session, team)
        return new_team

async def deactivate_teams(session: aiohttp.ClientSession, pool_id: int, scraped_team_names: set) -> None:
    """
    Désactive les équipes qui existent en base mais n'ont pas été scrapées pour une pool spécifique.
    """
    teams = await get_active_teams_by_pool_id(session, pool_id)
    if not teams:
        return

    teams_to_deactivate = [team for team in teams if team.team_name not in scraped_team_names]
    for team in teams_to_deactivate:
        try:
            await deactivate_team(session, team.id)
        except Exception as e:
            log_event(
                action="deactivate_team",
                level="error",
                team_name=team.team_name,
                team_id=team.id,
                error=str(e),  # Message principal de l'exception
                exception_type=type(e).__name__,  # Type de l'exception
                traceback=traceback.format_exc()  # Traceback complet sous forme de chaîne
            )