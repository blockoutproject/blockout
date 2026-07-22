from blockout_contract_clients.team.api.team_api import TeamApi

from scraper.application.models import Team
from scraper.infrastructure.blockout.teams import create_team, get_teams, update_team


async def add_or_update_team(
    api: TeamApi,
    team: Team,
    existing_team: Team | None,
) -> Team:
    """Create a team or apply the legacy owner-controlled update fields."""
    required_fields = [
        "club_id",
        "league_code",
        "division_id",
        "raw_name",
        "season",
        "format",
        "gender",
    ]
    missing_fields = [
        field for field in required_fields if not getattr(team, field, None)
    ]
    if missing_fields:
        raise ValueError(
            f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}."
        )

    if existing_team:
        changes_list = []
        team.id = existing_team.id

        for field in ["club_id", "division_id", "format", "gender", "raw_name"]:
            if getattr(existing_team, field, None) != getattr(team, field, None):
                changes_list.append(
                    f"{field}: {getattr(existing_team, field)} -> {getattr(team, field)}"
                )

        if not existing_team.active:
            team.active = True
            changes_list.append("Équipe réactivée")
        if changes_list:
            return await update_team(api, team, changes_list)
        return existing_team
    return await create_team(api, team)


async def find_team_by_name_in_division_format_gender_season(
    api: TeamApi,
    division_id: int,
    competition_format: str,
    gender: str,
    season: str,
    raw_name: str,
) -> Team | None:
    """Find the first team whose raw owner name matches case-insensitively."""
    teams = await get_teams(api, division_id, competition_format, gender, season)
    if not teams:
        return None

    searched_lower = raw_name.strip().lower()

    for t in teams:
        if t.raw_name.strip().lower() == searched_lower:
            return t

    return None
