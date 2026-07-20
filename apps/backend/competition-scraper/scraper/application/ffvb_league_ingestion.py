"""Shared owner orchestration for discovered FFVB league pools."""

import asyncio
from collections import defaultdict
from collections.abc import Awaitable

from scraper.application.calendar_ingestion import (
    CalendarIngestionResult,
    handle_csv_download_and_parse,
)
from scraper.application.source import Scraper
from scraper.infrastructure.blockout.competitions import bulk_deactivate_pools
from scraper.infrastructure.blockout.configuration import (
    create_raw_division_mapping,
    get_raw_division_mappings_by_league_and_season,
)
from scraper.infrastructure.blockout.pool import PoolInternalResponse
from scraper.infrastructure.blockout.pools import get_pools_by_league_and_season
from scraper.infrastructure.blockout.raw_division_mapping import (
    RawDivisionMappingInternalResponse,
)
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
    existing_pools = (
        await get_pools_by_league_and_season(scraper.session, league_code, season) or []
    )
    existing_by_key = {
        (pool.poolCode, pool.leagueCode, pool.season): pool for pool in existing_pools
    }
    mappings = (
        await get_raw_division_mappings_by_league_and_season(
            scraper.session, league_code, season
        )
        or []
    )
    mapping_by_name = {mapping.rawDivisionName: mapping for mapping in mappings}
    observation_complete = True
    pending: list[Awaitable[CalendarIngestionResult]] = []

    for source in sources:
        mapping = mapping_by_name.get(source.raw_division_name)
        if mapping is None:
            mapping = await create_raw_division_mapping(
                scraper.session,
                RawDivisionMappingInternalResponse(
                    rawDivisionName=source.raw_division_name,
                    leagueCode=league_code,
                    season=season,
                ),
            )
            mapping_by_name[source.raw_division_name] = mapping
            observation_complete = False
            continue
        if not mapping.is_mapped():
            observation_complete = False
            continue

        pool = PoolInternalResponse(
            poolCode=source.code,
            leagueCode=league_code,
            season=season,
            leagueName=league_name,
            rawName=source.name,
            name=source.name,
            shortName=source.name,
            divisionId=mapping.divisionId,
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
        await bulk_deactivate_pools(scraper.session, missing_ids)


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
