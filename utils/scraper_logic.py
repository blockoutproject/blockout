from typing import Optional
from api.matches_api import bulk_deactivate_matches
from api.pools_api import update_pool
from config.logger_config import log_event
from models.match import Match
from models.pool import Pool
from models.scraper import Scraper
from models.team import Team
from services.pools_service import add_or_update_pool
from services.teams_service import add_or_update_team
from api.competitions_api import add_team_to_pool, bulk_deactivate_teams_by_pool
from api.teams_api import get_teams
from utils.file_utils import download_and_parse_csv
from utils.html_utils import extract_club_stats_list
from utils.match_utils import compute_volleyball_match_stats, is_anomalous_set_format
from utils.team_utils import get_full_name, get_short_name, normalize
from utils.utils import capitalize_words, parse_date
from models.enums.datasource_priority import DataSourcePriority


async def handle_csv_download_and_parse(
    scraper: Scraper,
    pool: Pool,
    raw_season: str,
    existing_pool=None,
    scraped_pool_ids: Optional[set[int]] = None
) -> None:
    if scraper.session.closed:
        log_event(
            "csv_download_session_closed", 
            "error", 
            pool_name=pool.name,
            message="Session fermée avant téléchargement CSV"
        )
        return

    try:
        if existing_pool == 393:
            print('11111Found pool D1M')
        parsed_data = await download_and_parse_csv(scraper, pool, raw_season)
        if existing_pool == 393:
            print('22222Found pool D1M')
            print(parsed_data)
            print(scraped_pool_ids)
        if not parsed_data:
            if scraped_pool_ids is not None and existing_pool:
                scraped_pool_ids.add(existing_pool.id) # Pour éviter désactivation si crash avant parsing
            log_event(
                "download_and_parse_csv_failed", 
                "error", 
                pool_name=pool.name,
                season=raw_season, 
                message="Échec téléchargement CSV"
            )
            return
        

        valid_rows = [
            row for row in parsed_data
            if row.get("match_code") and row.get("club_a_id") and row.get("club_b_id")
            and parse_date(row.get('match_date'), row.get('match_time'))
        ]
        if not valid_rows:
            log_event(
                "invalid_rows_found_in_csv", 
                "error", 
                pool_name=pool.name,
                season=raw_season, 
                message="Échec parsing CSV"
            )
            return

        new_pool = await add_or_update_pool(scraper.session, pool, existing_pool, False)
        pool.id = new_pool.id # Update the pool ID after creation or update for upcoming Pro Scraper functions
        await scraper.init_matches_cache(new_pool.id)
        await scraper.init_associations_cache(new_pool.id)

        existing_teams = await get_teams(scraper.session, new_pool.division_id, new_pool.format, new_pool.gender, new_pool.season) or []
        active_team_ids = {
            t_id for (p_id, t_id), (original, _) in scraper._associations_cache.items()
            if p_id == new_pool.id and original is not None
        }

        existing_teams_dict = {
            (t.club_id, t.division_id, t.format, t.gender, normalize(t.raw_name)): t
            for t in existing_teams
        }

        scraped_team_ids = set()
        scraped_match_codes = set()
        
        # Vérification des matchs anormaux pour savoir si on parse le classement avec un calcul ou avec la page HTML
        has_anomalous_match = False
        for row in valid_rows:
            set_str = row.get("set")
            if set_str and is_anomalous_set_format(set_str):
                has_anomalous_match = True
                break 

        for row in valid_rows:
            match_datetime = parse_date(row.get('match_date'), row.get('match_time'))
            if not match_datetime:
                continue

            # Team A
            team_a_full = get_full_name(row['team_a_name'], new_pool.gender)
            team_a_short = get_short_name(row['team_a_name'], new_pool.gender)
            team_a_key = (row['club_a_id'], new_pool.division_id, new_pool.format, new_pool.gender, normalize(team_a_full))
            existing_team_a = existing_teams_dict.get(team_a_key)
                            
            team_a_obj = Team(
                raw_name=team_a_full,
                name=team_a_full,
                short_name=team_a_short,
                club_id=row['club_a_id'],
                season= new_pool.season,
                league_code=new_pool.league_code,
                division_id=new_pool.division_id,
                format=new_pool.format,
                gender=new_pool.gender
            )

            new_team_a = await add_or_update_team(scraper.session, team_a_obj, existing_team_a)
            existing_teams_dict[team_a_key] = new_team_a
            scraped_team_ids.add(new_team_a.id)

            # Team B
            team_b_full = get_full_name(row['team_b_name'], new_pool.gender)
            team_b_short = get_short_name(row['team_b_name'], new_pool.gender)
            team_b_key = (row['club_b_id'], new_pool.division_id, new_pool.format, new_pool.gender, normalize(team_b_full))
            existing_team_b = existing_teams_dict.get(team_b_key)

            team_b_obj = Team(
                raw_name=team_b_full,
                name=team_b_full,
                short_name=team_b_short,
                club_id=row['club_b_id'],
                season= new_pool.season,
                league_code=new_pool.league_code,
                division_id=new_pool.division_id,
                format=new_pool.format,
                gender=new_pool.gender
            )

            new_team_b = await add_or_update_team(scraper.session, team_b_obj, existing_team_b)
            existing_teams_dict[team_b_key] = new_team_b
            scraped_team_ids.add(new_team_b.id)

            # Match
            match_code = row.get('match_code')
            updated_match = Match(
                match_code=match_code,
                league_code=new_pool.league_code,
                pool_id=new_pool.id,
                team_id_a=new_team_a.id,
                team_id_b=new_team_b.id,
                match_date=match_datetime,
                season=new_pool.season,
                set=row.get('set').replace('/', '-') if row.get('set') else None,
                score=row.get('score') or None,
                venue=capitalize_words(row.get('venue')),
                first_referee=capitalize_words(row.get('first_referee')),
                second_referee=capitalize_words(row.get('second_referee'))
            )
            scraped_match_codes.add(match_code)

            for team_obj in [new_team_a, new_team_b]:
                if team_obj.id not in active_team_ids:
                    await add_team_to_pool(scraper.session, new_pool.id, team_obj.id, team_obj.club_id)
                    log_event(
                        "add_team_to_pool", 
                        "info", 
                        pool_id=new_pool.id, 
                        team_id=team_obj.id, 
                        club_id=team_obj.club_id
                    )
                    active_team_ids.add(team_obj.id)

            # Association stats
            if not has_anomalous_match and updated_match.set:
                try:
                    set_a, set_b = updated_match.set.split('-')
                    team_a_stats, team_b_stats = compute_volleyball_match_stats(set_a, set_b, updated_match.score)

                    scraper.schedule_association_update(new_pool.id, new_team_a.id, team_a_stats)
                    scraper.schedule_association_update(new_pool.id, new_team_b.id, team_b_stats)
                except Exception as e:
                    log_event(
                        "score_parsing_exception", 
                        "error", 
                        match_code=match_code, 
                        set=updated_match.set,
                        error=str(e), 
                        message="Erreur parsing score pour calcul des stats"
                    )

            scraper.schedule_match_changes(updated_match=updated_match, prefix="CSV", priority=DataSourcePriority.FFVB)

        # Fallback classement si anomalie
        if has_anomalous_match:
            stats_list = await extract_club_stats_list(scraper, raw_season, new_pool)
            fallback_teams = await get_teams(scraper.session, ids=list(active_team_ids)) or []
            team_lookup = {normalize(t.raw_name): t for t in fallback_teams}

            for team_name, stats in stats_list:
                normalized_name = normalize(get_full_name(team_name, new_pool.gender))
                matched_team = team_lookup.get(normalized_name)
                if not matched_team:
                    log_event(
                        "team_stats_match_fail", 
                        "warning", 
                        pool_id=new_pool.id, 
                        team_name=team_name, 
                        message="Aucune équipe existante ne correspond à ce nom"
                    )
                    continue

                scraper.schedule_association_update(new_pool.id, matched_team.id, stats)

        if not scraped_match_codes:
            return

        if not new_pool.active:
            new_pool.active = True
            await update_pool(scraper.session, new_pool, ["Pool réactivée après détection de matchs"])

        if scraped_pool_ids is not None:
            scraped_pool_ids.add(new_pool.id)

        # Cleanup
        missing_teams = list(active_team_ids - scraped_team_ids)
        if missing_teams:
            await bulk_deactivate_teams_by_pool(scraper.session, new_pool.id, missing_teams)

        missing_matches = {
            match_code
            for (league_code, match_code), (existing_match, *_) in scraper._matches_cache.items()
            if existing_match and existing_match.pool_id == new_pool.id
            and match_code not in scraped_match_codes and existing_match.active
        }
        if missing_matches:
            await bulk_deactivate_matches(scraper.session, new_pool.id, missing_matches)

    except Exception as e:
        log_event("parse_csv_error", "error", error=str(e), message="Erreur lors du parsing CSV")
        raise