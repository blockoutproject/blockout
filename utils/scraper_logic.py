import asyncio
import aiohttp
from api.matches_api import get_matches_by_pool
from api.teams_api import get_teams_by_division_format_gender, get_teams_by_pool
from models.pool import Pool
from utils.downloader import download_csv
from models.match import Match, MatchStatus
from models.team import Team
from services.matchs_service import add_or_update_match, deactivate_matches
from services.teams_service import add_or_update_team, deactivate_teams
from utils.utils import parse_date
from utils.file_utils import parse_csv
from config.logger_config import log_event

async def handle_csv_download_and_parse(
    session: aiohttp.ClientSession,
    pool: Pool,
    season: str,
    folder: str
) -> None:
    """
    Gère le téléchargement et le parsing du CSV de manière asynchrone.
    """
    if session.closed:
        log_event(
            action="csv_download_session_closed",
            level="error",
            pool_id=pool.id,
            league_code=pool.league_code,
            pool_code=pool.pool_code,
            season=season,
            message="La session est fermée avant de commencer le téléchargement du CSV."
        )
        return

    try:
        csv_path = await download_csv(session, pool.league_code, pool.pool_code, season, folder)

        if not csv_path:
            log_event(
                action="download_csv_failed",
                level="error",
                league_code=pool.league_code,
                pool_code=pool.pool_code,
                season=season,
                message=f"Échec du téléchargement du CSV pour la pool {pool.pool_code}. Aucune donnée téléchargée."
            )
            raise RuntimeError(f"Échec du téléchargement du CSV pour la pool {pool.pool_code}")

        await parse_and_add_matches_from_csv(session, pool, csv_path)

    except Exception as e:
        log_event(
            action="process_csv_error",
            level="error",
            league_code=pool.league_code,
            pool_code=pool.pool_code,
            season=season,
            error=str(e),
            message=f"Erreur lors du traitement du CSV pour la pool {pool.pool_code} : {str(e)}"
        )
        raise

async def parse_and_add_matches_from_csv(session: aiohttp.ClientSession, pool: Pool, csv_path: str) -> None:
    """
    Parse le fichier CSV et ajoute les matchs et les équipes via des appels API REST.
    """
    try:
        # Récupérer tous les matchs existants pour la poule
        existing_matches = await get_matches_by_pool(session, pool.id) or []
        existing_matches_dict = {(match.league_code, match.match_code): match for match in existing_matches}

        # Récupération des équipes existantes, on ne filtre pas sur la poule car une équipe peut être dans plusieurs poules
        existing_teams = await get_teams_by_division_format_gender(session, pool.division_name, pool.format, pool.gender) or []
        existing_teams_dict = {(team.division_name, team.format, team.gender, team.team_name): team for team in existing_teams}

        scraped_team_names = set()
        scraped_match_codes = set()

        parsed_data = parse_csv(csv_path)
        if not parsed_data:
            log_event(
                action="csv_empty",
                level="error",
                csv_path=csv_path,
                message=f"Le fichier CSV {csv_path} ne contient pas de données valides."
            )
            raise ValueError(f"Le fichier CSV {csv_path} ne contient pas de données valides.")

        for data in parsed_data:
            club_a_id = data.get('club_a_id')
            club_b_id = data.get('club_b_id')

            if not club_a_id or not club_b_id:
                continue
            
            match_datetime = parse_date(data.get('match_date'), data.get('match_time'))
            
            if not match_datetime:
                log_event(
                    action="invalid_match_date",
                    level="error",
                    match_code=data.get('match_code'),
                    message=f"Date invalide pour le match {data.get('match_code')}. Match ignoré."
                )
                continue

            # Ajouter ou mettre à jour les équipes
            team_a_data = {
                "team_name": data.get('team_a_name'),
                "club_id": club_a_id,
                "pool_id": pool.id,
                "league_code": pool.league_code,
                "division_name": pool.division_name,
                "format": pool.format,
                "gender": pool.gender
            }
            team_b_data = {
                "team_name": data.get('team_b_name'),
                "club_id": club_b_id,
                "pool_id": pool.id,
                "league_code": pool.league_code,
                "division_name": pool.division_name,
                "format": pool.format,
                "gender": pool.gender
            }

            team_a = Team(**team_a_data)
            team_b = Team(**team_b_data)

            team_a_key = (team_a.division_name, team_a.format, team_a.gender, team_a.team_name)
            team_b_key = (team_b.division_name, team_b.format, team_b.gender, team_b.team_name)

            existing_team_a = existing_teams_dict.get(team_a_key)
            existing_team_b = existing_teams_dict.get(team_b_key)

            new_team_a = await add_or_update_team(session, team_a, existing_team_a)
            if team_a_key not in existing_teams_dict:
                existing_teams.append(new_team_a)
            existing_teams_dict[team_a_key] = new_team_a
            scraped_team_names.add(new_team_a.team_name)

            new_team_b = await add_or_update_team(session, team_b, existing_team_b)
            if team_b_key not in existing_teams_dict:
                existing_teams.append(new_team_b)
            existing_teams_dict[team_b_key] = new_team_b
            scraped_team_names.add(new_team_b.team_name)

            if new_team_a and new_team_b:
                match_data = {
                    "match_code": data.get('match_code'),
                    "league_code": data.get('league_code'),
                    "pool_id": pool.id,
                    "team_id_a": new_team_a.id,
                    "team_id_b": new_team_b.id,
                    "match_date": match_datetime,
                    "set": None if not data.get('set') else data['set'].replace('/', '-'),
                    "score": None if not data.get('score') else data['score'],
                    "status": MatchStatus.FINISHED if data.get('set') and data.get('score') else MatchStatus.UPCOMING,
                    "venue": data.get('venue'),
                    "referee1": data.get('referee1'),
                    "referee2": data.get('referee2')
                }
                match = Match(**match_data)

                match_key = (match.league_code, match.match_code)
                existing_match = existing_matches_dict.get(match_key)

                new_match = await add_or_update_match(session, match, existing_match)
                if match_key not in existing_matches_dict:
                    existing_matches.append(new_match)
                existing_matches_dict[match_key] = new_match
                scraped_match_codes.add(new_match.match_code)

        await asyncio.gather(
            deactivate_teams(session, pool.id, scraped_team_names),
            deactivate_matches(session, pool.id, scraped_match_codes)
        )

    except Exception as e:
        log_event(
            action="parse_csv_error",
            level="error",
            csv_path=csv_path,
            error=str(e),
            message=f"Erreur lors du parsing du CSV"
        )
        raise