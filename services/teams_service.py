from typing import Optional
import aiohttp
from api.teams_api import create_team, get_teams, update_team
from models.team import Team

async def add_or_update_team(session: aiohttp.ClientSession, team: Team, existing_team: Optional[Team]) -> Team:
    """
    Vérifie l'existence d'une équipe et la met à jour ou la crée selon les besoins.
    """
    required_fields = ['club_id', 'league_code', 'division_id', 'raw_name', 'season']
    missing_fields = [field for field in required_fields if not getattr(team, field, None)]
    if missing_fields:
        raise ValueError(f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}.")
        
    if existing_team:
        changes_list = []
        team.id = existing_team.id
        
        for field in ['club_id', 'division_id', 'format', 'gender', 'raw_name']: # A revoir car pas forcement bon, ici on cherche à modifer les champs uniques ...
            # if existing_team.raw_name == "MONTAUBAN VOLLEY-BALL 82" and team.raw_name == "MONTAUBAN VOLLEY BALL 82" and field == 'raw_name':
            #     print("222222222222")
            #     print("-------- Existing team before changes check:", existing_team)
            #     print("New team data:", team)
            #     print(f"{field}: {getattr(existing_team, field)} -> {getattr(team, field)}")
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
    
async def find_team_by_name_in_division_format_gender_season(
    session,
    division_id: str,
    format: str,
    gender: str,
    season: str,
    raw_name: str
) -> Optional[Team]:
    """
    1) Récupère toutes les équipes correspondant à (division_id, format, gender).
    2) Filtre pour trouver celle dont raw_name correspond à 'searched_name' (insensible à la casse).
    3) Retourne la première correspondante ou None si introuvable.
    """
    teams = await get_teams(session, division_id, format, gender, season)
    if not teams:
        return None
    
    # On peut standardiser les noms (lowercase, trim, etc.) selon ta logique
    searched_lower = raw_name.strip().lower()

    for t in teams:
        if t.raw_name.strip().lower() == searched_lower:
            return t
    
    return None