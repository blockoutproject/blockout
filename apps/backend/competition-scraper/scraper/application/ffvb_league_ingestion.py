"""Shared owner orchestration for discovered FFVB league pools."""

import asyncio
from collections import defaultdict
from collections.abc import Awaitable

from scraper.application.calendar_ingestion import (
    CalendarIngestionResult,
    handle_csv_download_and_parse,
)
from scraper.application.source import Scraper
from scraper.domain.models import Pool, RawDivisionMapping
from scraper.infrastructure.ffvb.models import FfvbPoolSource


async def ingest_league_pools(
    scraper: Scraper,
    league_code: str,
    league_name: str,
    sources: tuple[FfvbPoolSource, ...],
) -> None:
    """Ingest each observed season without reconciling across incomplete input."""
    by_season: dict[str, list[FfvbPoolSource]] = defaultdict(list)
    for source in sources:
        by_season[source.season].append(source)
    for season, season_sources in by_season.items():
        await _ingest_season(
            scraper,
            league_code,
            league_name,
            season,
            tuple(season_sources),
        )


async def _ingest_season(
    scraper: Scraper,
    league_code: str,
    league_name: str,
    season: str,
    sources: tuple[FfvbPoolSource, ...],
) -> None:
    existing_pools = await scraper.blockout.get_pools(league_code, season)
    existing_by_key = {
        (pool.pool_code, pool.league_code, pool.season): pool for pool in existing_pools
    }
    mappings = await scraper.blockout.get_raw_division_mappings(league_code, season)
    mapping_by_name = {mapping.raw_division_name: mapping for mapping in mappings}
    observation_complete = True
    pending: list[Awaitable[CalendarIngestionResult]] = []

    for source in sources:
        mapping = mapping_by_name.get(source.raw_division_name)
        if mapping is None:
            mapping = await scraper.blockout.create_raw_division_mapping(
                RawDivisionMapping(
                    raw_division_name=source.raw_division_name,
                    league_code=league_code,
                    season=season,
                ),
            )
            mapping_by_name[source.raw_division_name] = mapping
            observation_complete = False
            continue
        if not mapping.is_mapped():
            observation_complete = False
            continue

        pool = Pool(
            pool_code=source.code,
            league_code=league_code,
            season=season,
            league_name=league_name,
            raw_name=source.name,
            name=source.name,
            short_name=source.name,
            division_id=mapping.division_id,
            format=mapping.format,
            gender=mapping.gender,
        )
        pending.append(
            handle_csv_download_and_parse(
                scraper,
                pool,
                season,
                existing_pool=existing_by_key.get((source.code, league_code, season)),
            )
        )

    results = await _run_limited(pending, limit=20)
    successful = [
        result for result in results if isinstance(result, CalendarIngestionResult)
    ]
    complete = (
        observation_complete
        and len(successful) == len(results)
        and all(result.complete for result in successful)
    )
    if not complete:
        return

    observed_ids = {result.pool_id for result in successful if result.pool_id}
    missing_ids = {
        pool.id
        for pool in existing_pools
        if pool.active and pool.id not in observed_ids
    }
    if missing_ids:
        await scraper.blockout.bulk_deactivate_pools(missing_ids)


async def _run_limited(
    awaitables: list[Awaitable[CalendarIngestionResult]], limit: int
) -> list[CalendarIngestionResult | BaseException]:
    """Await a bounded set while reporting exceptions to the caller as results."""
    semaphore = asyncio.Semaphore(limit)

    async def guarded(
        awaitable: Awaitable[CalendarIngestionResult],
    ) -> CalendarIngestionResult:
        async with semaphore:
            return await awaitable

    return await asyncio.gather(
        *(guarded(awaitable) for awaitable in awaitables),
        return_exceptions=True,
    )
