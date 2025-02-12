import asyncio
from config.logger_config import log_event
from models.match import Match, MatchStatus
from models.pool import Pool
from models.scraper import Scraper
from models.team import Team
from services.matchs_service import deactivate_matches
from services.teams_service import add_or_update_team
from api.competitions_api import add_team_to_pool, bulk_deactivate_teams_by_pool, get_active_team_associations_by_pool
from api.teams_api import get_teams_by_division_format_gender
from utils.downloader import download_csv
from utils.file_utils import parse_csv
from utils.match_utils import compute_volleyball_match_stats
from utils.team_utils import get_full_name, get_short_name
from utils.utils import parse_date
from models.datasource_priority import DataSourcePriority

async def handle_csv_download_and_parse(
    scraper: Scraper,
    pool: Pool,
    season
) -> None:
    """
    1) init le cache (scraper.init_matches_cache)
    2) download CSV
    3) parse CSV => schedule_match_changes & schedule_association_update
    """
    if scraper.session.closed:
        log_event(
            action="csv_download_session_closed",
            level="error",
            pool_id=pool.id,
            message="Session fermée avant téléchargement CSV"
        )
        return

    try:
        # 1) Init le cache => on charge les matchs et les associations existants pour pool.id
        await scraper.init_matches_cache(pool.id)
        await scraper.init_associations_cache(pool.id)

        # 2) download le CSV
        csv_path = await download_csv(scraper, pool, season)
        if not csv_path:
            log_event(
                action="download_csv_failed",
                level="error",
                message="Échec téléchargement CSV",
                pool_id=pool.id,
                season=season
            )
            return

        # 3) parse CSV
        parsed_data = parse_csv(csv_path)
        if not parsed_data:
            log_event(
                action="csv_empty",
                level="error",
                csv_path=csv_path,
                message=f"Fichier CSV vide"
            )
            return

        # Teams existantes
        existing_teams = await get_teams_by_division_format_gender(
            scraper.session, pool.division_name, pool.format, pool.gender
        ) or []

        existing_teams_dict = {
            (t.club_id, t.division_name, t.format, t.gender, t.name): t
            for t in existing_teams
        }

        # Associations actives
        active_assoc = await get_active_team_associations_by_pool(scraper.session, pool.id)
        active_team_ids = {assoc.team_id for assoc in active_assoc} #????

        scraped_team_ids = set()
        scraped_match_codes = set()

        for row in parsed_data:
            club_a_id = row.get('club_a_id')
            club_b_id = row.get('club_b_id')
            if not club_a_id or not club_b_id:
                continue

            match_datetime = parse_date(row.get('match_date'), row.get('match_time'))
            if not match_datetime:
                log_event(
                    action="invalid_match_date",
                    level="error",
                    match_code=row.get('match_code'),
                    message="Date invalide"
                )
                continue
            
            team_a_full_name = get_full_name(row.get('team_a_name'), pool.gender)
            team_b_full_name = get_full_name(row.get('team_b_name'), pool.gender)
            
            team_a_short_name = get_short_name(row.get('team_a_name'), pool.gender)
            team_b_short_name = get_short_name(row.get('team_b_name'), pool.gender)
            
            # Teams
            team_a_data = {
                "name": team_a_full_name,
                "short_name": team_a_short_name,
                "club_id": club_a_id,
                "league_code": pool.league_code,
                "division_name": pool.division_name,
                "format": pool.format,
                "gender": pool.gender
            }
            team_b_data = {
                "name": team_b_full_name,
                "short_name": team_b_short_name,
                "club_id": club_b_id,
                "league_code": pool.league_code,
                "division_name": pool.division_name,
                "format": pool.format,
                "gender": pool.gender
            }

            # Création/update teams
            team_a_key = (club_a_id, pool.division_name, pool.format, pool.gender, team_a_full_name)
            existing_team_a = existing_teams_dict.get(team_a_key)
            new_team_a = await add_or_update_team(scraper.session, Team(**team_a_data), existing_team_a)
            existing_teams_dict[team_a_key] = new_team_a
            scraped_team_ids.add(new_team_a.id)
        
            team_b_key = (club_b_id, pool.division_name, pool.format, pool.gender, team_b_full_name)
            existing_team_b = existing_teams_dict.get(team_b_key)
            new_team_b = await add_or_update_team(scraper.session, Team(**team_b_data), existing_team_b)
            existing_teams_dict[team_b_key] = new_team_b
            scraped_team_ids.add(new_team_b.id)

            # Match
            match_code = row.get('match_code')
            status = MatchStatus.FINISHED if row.get('set') else MatchStatus.UPCOMING

            updated_match = Match(
                match_code=match_code,
                league_code=pool.league_code,
                pool_id=pool.id,
                team_id_a=new_team_a.id,
                team_id_b=new_team_b.id,
                match_date=match_datetime,
                set=row.get('set').replace('/', '-') if row.get('set') else None,
                score=row.get('score') or None,
                status=status,
                venue=row.get('venue'),
                referee1=row.get('referee1'),
                referee2=row.get('referee2')
            )
            
            scraped_match_codes.add(match_code)
            
            # Gestion des associations (création si nécessaire)
            if new_team_a.id not in active_team_ids:
                await add_team_to_pool(scraper.session, scraper.category, pool.id, new_team_a.id)
                active_team_ids.add(new_team_a.id)
            if new_team_b.id not in active_team_ids:
                await add_team_to_pool(scraper.session, scraper.category, pool.id, new_team_b.id)
                active_team_ids.add(new_team_b.id)
            
            # Mise à jour des statistiques d'association en fonction du résultat
            if updated_match.status == MatchStatus.FINISHED and updated_match.set:
                try:
                    parts = updated_match.set.split('-')
                    if len(parts) == 2:
                        set_a = parts[0]
                        set_b = parts[1]

                        # Calcul des statistiques du match pour chaque équipe
                        team_a_stats, team_b_stats = compute_volleyball_match_stats(set_a, set_b, pool, updated_match.score)
                        
                        # Mise à jour de l'association pour chaque équipe en cumulant ces stats
                        scraper.schedule_association_update(
                            pool_id=pool.id,
                            team_id=new_team_a.id,
                            team_stats=team_a_stats
                        )
                        scraper.schedule_association_update(
                            pool.id,
                            new_team_b.id,
                            team_stats=team_b_stats
                        )
                except Exception as e:
                    log_event(
                        action="score_parsing_exception",
                        level="error",
                        match_code=match_code,
                        set=updated_match.set,
                        error=str(e),
                        message="Erreur lors du parsing du score pour le calcul des stats."
                    )

            # Fusion
            scraper.schedule_match_changes(
                updated_match=updated_match,
                prefix="CSV",
                priority=DataSourcePriority.FFVB
            )

        # Désactivation
        await asyncio.gather(
            bulk_deactivate_teams_by_pool(scraper.session, pool.id, scraped_team_ids),
            deactivate_matches(scraper.session, pool.id, scraped_match_codes)
        )

    except Exception as e:
        log_event(
            action="parse_csv_error",
            level="error",
            error=str(e),
            message="Erreur lors du parsing CSV"
        )
        raise