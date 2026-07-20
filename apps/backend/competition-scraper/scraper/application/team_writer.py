import aiohttp

from scraper.infrastructure.blockout.team import TeamInternalResponse
from scraper.infrastructure.blockout.teams import create_team, get_teams, update_team


async def add_or_update_team(
    session: aiohttp.ClientSession,
    team: TeamInternalResponse,
    existing_team: TeamInternalResponse | None,
) -> TeamInternalResponse:
    """Create a team or apply the legacy owner-controlled update fields."""
    required_fields = ["clubId", "leagueCode", "divisionId", "rawName", "season"]
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

        for field in ["clubId", "divisionId", "format", "gender", "rawName"]:
            if getattr(existing_team, field, None) != getattr(team, field, None):
                changes_list.append(
                    f"{field}: {getattr(existing_team, field)} -> {getattr(team, field)}"
                )

        if not existing_team.active:
            team.active = True
            changes_list.append("Équipe réactivée")
        if changes_list:
            return await update_team(session, team, changes_list)
        return existing_team
    return await create_team(session, team)


async def find_team_by_name_in_division_format_gender_season(
    session: aiohttp.ClientSession,
    division_id: int,
    competition_format: str,
    gender: str,
    season: str,
    raw_name: str,
) -> TeamInternalResponse | None:
    """Find the first team whose raw owner name matches case-insensitively."""
    teams = await get_teams(session, division_id, competition_format, gender, season)
    if not teams:
        return None

    searched_lower = raw_name.strip().lower()

    for t in teams:
        if t.rawName.strip().lower() == searched_lower:
            return t

    return None
