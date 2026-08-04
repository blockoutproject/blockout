"""Ingest one typed FFVB calendar snapshot into Blockout owner services."""

from dataclasses import dataclass

from scraper.application.pool_writer import add_or_update_pool
from scraper.application.source import Scraper
from scraper.application.team_writer import add_or_update_team
from scraper.domain.data_source_priority import DataSourcePriority
from scraper.domain.models import AssociationStats, Match, Pool, Team
from scraper.domain.normalization import capitalize_words, parse_date
from scraper.domain.team import get_full_name, get_short_name, normalize
from scraper.infrastructure.ffvb.calendar import download_and_parse_csv
from scraper.infrastructure.ffvb.models import FfvbRanking
from scraper.infrastructure.ffvb.ranking import extract_club_stats_list
from scraper.observability.logging import log_event


@dataclass(frozen=True)
class CalendarIngestionResult:
    """Report whether one observed pool is safe for destructive reconciliation."""

    pool_id: int | None
    complete: bool


class OwnerStatePreloadError(RuntimeError):
    """Stop one pool when its owner reconciliation baseline is unavailable."""


async def handle_csv_download_and_parse(
    scraper: Scraper,
    pool: Pool,
    raw_season: str,
    existing_pool: Pool | None = None,
    scraped_pool_ids: set[int] | None = None,
) -> CalendarIngestionResult:
    """Apply one calendar snapshot and gate cleanup on complete provider input."""
    try:
        snapshot = await download_and_parse_csv(scraper, pool, raw_season)
        if snapshot is None:
            if scraped_pool_ids is not None and existing_pool:
                # A failed provider read must not deactivate an already known pool.
                scraped_pool_ids.add(existing_pool.id)
            log_event(
                "download_and_parse_csv_failed",
                "error",
                pool_name=pool.name,
                season=raw_season,
                message="Échec téléchargement CSV",
            )
            return CalendarIngestionResult(
                pool_id=existing_pool.id if existing_pool else None,
                complete=False,
            )

        valid_rows = [
            row
            for row in snapshot.matches
            if row.match_code
            and row.home_club_id
            and row.away_club_id
            and parse_date(row.match_date, row.match_time)
        ]
        observation_complete = snapshot.complete and len(valid_rows) == len(
            snapshot.matches
        )
        if not valid_rows:
            if scraped_pool_ids is not None and existing_pool:
                scraped_pool_ids.add(existing_pool.id)
            log_event(
                "invalid_rows_found_in_csv",
                "error",
                pool_name=pool.name,
                season=raw_season,
                message="Échec parsing CSV",
            )
            return CalendarIngestionResult(
                pool_id=existing_pool.id if existing_pool else None,
                complete=observation_complete,
            )

        new_pool = await add_or_update_pool(
            scraper.blockout, pool, existing_pool, False
        )
        # Professional enrichment reuses the owner identifier assigned here.
        pool.id = new_pool.id
        await _preload_owner_state(scraper, new_pool.id)

        existing_teams = (
            await scraper.blockout.get_teams(
                new_pool.division_id,
                new_pool.format,
                new_pool.gender,
                new_pool.season,
            )
            or []
        )
        active_team_ids = {
            t_id
            for (p_id, t_id), (original, _) in scraper._associations_cache.items()
            if p_id == new_pool.id and original is not None
        }

        existing_teams_dict = {
            (t.club_id, t.division_id, t.format, t.gender, normalize(t.raw_name)): t
            for t in existing_teams
        }

        scraped_team_ids = set()
        scraped_match_codes = set()
        is_nat_or_pro = new_pool.league_code in {"AALNV", "ABCCS"}

        # Owner rankings remain authoritative for association statistics.
        has_anomalous_match = True

        for row in valid_rows:
            match_datetime = parse_date(row.match_date, row.match_time)
            if not match_datetime:
                continue

            team_a_full = get_full_name(row.home_team_name, new_pool.gender)
            team_a_short = get_short_name(row.home_team_name, new_pool.gender)
            team_a_key = (
                row.home_club_id,
                new_pool.division_id,
                new_pool.format,
                new_pool.gender,
                normalize(team_a_full),
            )
            existing_team_a = existing_teams_dict.get(team_a_key)

            team_a_obj = Team(
                raw_name=team_a_full,
                name=team_a_full,
                short_name=team_a_short,
                club_id=row.home_club_id,
                season=new_pool.season,
                league_code=new_pool.league_code,
                division_id=new_pool.division_id,
                format=new_pool.format,
                gender=new_pool.gender,
            )

            new_team_a = await add_or_update_team(
                scraper.blockout, team_a_obj, existing_team_a
            )
            existing_teams_dict[team_a_key] = new_team_a
            scraped_team_ids.add(new_team_a.id)

            team_b_full = get_full_name(row.away_team_name, new_pool.gender)
            team_b_short = get_short_name(row.away_team_name, new_pool.gender)
            team_b_key = (
                row.away_club_id,
                new_pool.division_id,
                new_pool.format,
                new_pool.gender,
                normalize(team_b_full),
            )
            existing_team_b = existing_teams_dict.get(team_b_key)

            team_b_obj = Team(
                raw_name=team_b_full,
                name=team_b_full,
                short_name=team_b_short,
                club_id=row.away_club_id,
                season=new_pool.season,
                league_code=new_pool.league_code,
                division_id=new_pool.division_id,
                format=new_pool.format,
                gender=new_pool.gender,
            )

            new_team_b = await add_or_update_team(
                scraper.blockout, team_b_obj, existing_team_b
            )
            existing_teams_dict[team_b_key] = new_team_b
            scraped_team_ids.add(new_team_b.id)

            match_code = row.match_code
            updated_match = Match(
                match_code=match_code,
                league_code=new_pool.league_code,
                pool_id=new_pool.id,
                team_id_a=new_team_a.id,
                team_id_b=new_team_b.id,
                match_date=match_datetime,
                season=new_pool.season,
                set=row.set_score.replace("/", "-") if row.set_score else None,
                score=row.points_score,
                venue=capitalize_words(row.venue),
                first_referee=capitalize_words(row.first_referee),
                second_referee=capitalize_words(row.second_referee),
            )
            scraped_match_codes.add(match_code)

            for team_obj in [new_team_a, new_team_b]:
                if team_obj.id not in active_team_ids:
                    await scraper.blockout.add_team_to_pool(
                        new_pool.id,
                        team_obj.id,
                        team_obj.club_id,
                    )
                    log_event(
                        "add_team_to_pool",
                        "info",
                        pool_id=new_pool.id,
                        team_id=team_obj.id,
                        club_id=team_obj.club_id,
                    )
                    active_team_ids.add(team_obj.id)

            scraper.schedule_match_changes(
                updated_match=updated_match,
                prefix="CSV",
                priority=DataSourcePriority.FFVB,
            )

        if has_anomalous_match or is_nat_or_pro:
            stats_list = await extract_club_stats_list(scraper, raw_season, new_pool)
            fallback_teams = (
                await scraper.blockout.get_teams(ids=list(active_team_ids)) or []
            )
            team_lookup = {normalize(t.raw_name): t for t in fallback_teams}

            for ranking in stats_list:
                normalized_name = normalize(
                    get_full_name(ranking.team_name, new_pool.gender)
                )
                matched_team = team_lookup.get(normalized_name)
                if not matched_team:
                    log_event(
                        "team_stats_match_fail",
                        "warning",
                        pool_id=new_pool.id,
                        team_name=ranking.team_name,
                        message="Aucune équipe existante ne correspond à ce nom",
                    )
                    continue

                scraper.schedule_association_update(
                    new_pool.id,
                    matched_team.id,
                    _ranking_stats(ranking),
                )

        if not scraped_match_codes:
            return CalendarIngestionResult(
                pool_id=new_pool.id,
                complete=snapshot.complete,
            )

        if not new_pool.active:
            new_pool.active = True
            await scraper.blockout.update_pool(
                new_pool, ["Pool réactivée après détection de matchs"]
            )

        if scraped_pool_ids is not None:
            scraped_pool_ids.add(new_pool.id)

        missing_teams = list(active_team_ids - scraped_team_ids)
        if observation_complete and missing_teams:
            await scraper.blockout.bulk_deactivate_teams(
                new_pool.id, set(missing_teams)
            )

        missing_matches = {
            match_code
            for (_league_code, match_code), (
                existing_match,
                *_,
            ) in scraper._matches_cache.items()
            if existing_match
            and existing_match.pool_id == new_pool.id
            and match_code not in scraped_match_codes
            and existing_match.active
        }
        if observation_complete and missing_matches:
            await scraper.blockout.bulk_deactivate_matches(new_pool.id, missing_matches)

        return CalendarIngestionResult(
            pool_id=new_pool.id,
            complete=observation_complete,
        )

    except OwnerStatePreloadError:
        raise
    except Exception as e:
        log_event(
            "parse_csv_error",
            "error",
            error_type=type(e).__name__,
            message="Erreur lors du parsing CSV",
        )
        raise


async def _preload_owner_state(scraper: Scraper, pool_id: int) -> None:
    for operation, loader in (
        ("load_matches", scraper.init_matches_cache),
        ("load_active_team_associations", scraper.init_associations_cache),
    ):
        try:
            await loader(pool_id)
        except Exception as error:
            log_event(
                action="owner_state_preload_error",
                level="error",
                scraper=scraper.name,
                pool_id=pool_id,
                operation=operation,
                error_type=type(error).__name__,
                exception_context=(
                    "Owner API state is unavailable; inspect the dependency and "
                    "retry before reconciling this pool."
                ),
            )
            raise OwnerStatePreloadError(
                f"Owner state preload failed during {operation} for pool {pool_id}."
            ) from error


def _ranking_stats(ranking: FfvbRanking) -> AssociationStats:
    return AssociationStats(
        points=ranking.points,
        played=ranking.played,
        wins=ranking.wins,
        losses=ranking.losses,
        wins_three_to_zero=ranking.wins_three_to_zero,
        wins_three_to_one=ranking.wins_three_to_one,
        wins_three_to_two=ranking.wins_three_to_two,
        losses_two_to_three=ranking.losses_two_to_three,
        losses_one_to_three=ranking.losses_one_to_three,
        losses_zero_to_three=ranking.losses_zero_to_three,
        won_sets=ranking.won_sets,
        lost_sets=ranking.lost_sets,
        coefficient_sets=ranking.coefficient_sets,
        won_points=ranking.won_points,
        lost_points=ranking.lost_points,
        coefficient_points=ranking.coefficient_points,
        points_penalty=0,
    )
