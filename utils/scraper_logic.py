import asyncio
from typing import Optional
from api.matches_api import bulk_deactivate_matches
from api.pools_api import update_pool
from config.logger_config import log_event
from models.match import Match, MatchStatus
from models.pool import Pool
from models.scraper import Scraper
from models.team import Team
from services.teams_service import add_or_update_team
from api.competitions_api import add_team_to_pool, bulk_deactivate_teams_by_pool
from api.teams_api import get_teams_by_division_format_gender
from utils.file_utils import download_and_parse_csv
from utils.match_utils import compute_volleyball_match_stats
from utils.team_utils import get_full_name, get_short_name
from utils.utils import parse_date
from models.datasource_priority import DataSourcePriority

async def handle_csv_download_and_parse(
    scraper: Scraper,
    pool: Pool,
    season: int,
    scraped_pool_ids: Optional[set[int]] = None
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
        # Init le cache => on charge les matchs et les associations existants pour pool.id
        await scraper.init_matches_cache(pool.id)
        await scraper.init_associations_cache(pool.id)
        
        # download et parse le CSV
        parsed_data = await download_and_parse_csv(scraper, pool, season)
        if not parsed_data:
            log_event(
                action="download_and_parse_csv_failed",
                level="error",
                message="Échec téléchargement CSV",
                pool_id=pool.id,
                season=season
            )
            return
        
        parsed_list = list(parsed_data)
        
        # On vérifie qu'on a bien des données
        if not parsed_list:
            return
        
        # Teams existantes
        existing_teams = await get_teams_by_division_format_gender(
            scraper.session, pool.division_name, pool.format, pool.gender
        ) or []
        
        # Associations actives
        active_team_ids = {
            t_id
            for (p_id, t_id), (original, _) in scraper._associations_cache.items()
            if p_id == pool.id and original is not None
        }
        
        existing_teams_dict = {
            (t.club_id, t.division_name, t.format, t.gender, t.name): t
            for t in existing_teams
        }

        scraped_team_ids = set()
        scraped_match_codes = set()

        for row in parsed_list:
            club_a_id = row.get('club_a_id')
            club_b_id = row.get('club_b_id')
            
            if not club_a_id or not club_b_id:
                continue

            match_datetime = parse_date(row.get('match_date'), row.get('match_time'))
            if not match_datetime:
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
                await add_team_to_pool(scraper.session, scraper.category, pool.id, new_team_a.id, new_team_a.club_id)
                active_team_ids.add(new_team_a.id)
            if new_team_b.id not in active_team_ids:
                await add_team_to_pool(scraper.session, scraper.category, pool.id, new_team_b.id, new_team_b.club_id)
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

        # Vérifie qu'on a au moins un match scrappé
        if not scraped_match_codes:
            return
        
        # Si la pool n'est pas active, on la réactive 
        if not pool.active:
            pool.active = True
            await update_pool(scraper.session, pool, ["Pool réactivée après détection de matchs"])
            log_event(
                action="pool_manual_reactivation",
                level="info",
                pool_id=pool.id,
                message="Réactivation de la pool suite à la détection de matchs"
            )

        # Si on arrive ici, on a au moins un match, on peut continuer
        if scraped_pool_ids is not None:
            scraped_pool_ids.add(pool.id) 

        # Désactivation des équipes et des matchs manquants
        missing_team_ids = {
            team.id
            for team in existing_teams
            if team.id not in scraped_team_ids
        }
        if missing_team_ids:
            await bulk_deactivate_teams_by_pool(
                scraper.session,
                pool.id,
                list(missing_team_ids)
            )

        missing_match_codes = {
            match_code
            for (league_code, match_code), (existing_match, *_) in scraper._matches_cache.items()
            if existing_match 
            and existing_match.pool_id == pool.id
            and match_code not in scraped_match_codes
            and existing_match.active
        }
        if missing_match_codes:
            await bulk_deactivate_matches(
                scraper.session,
                pool.id,
                list(missing_match_codes)
            )    

    except Exception as e:
        log_event(
            action="parse_csv_error",
            level="error",
            error=str(e),
            message="Erreur lors du parsing CSV"
        )
        raise