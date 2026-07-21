"""Characterization of typed FFVB discovery and league ingestion."""

import asyncio
from pathlib import Path

from scraper.application import ffvb_league_ingestion as ingestion
from scraper.application.calendar_ingestion import CalendarIngestionResult
from scraper.infrastructure.blockout.pool import PoolInternalResponse
from scraper.infrastructure.blockout.raw_division_mapping import (
    RawDivisionMappingInternalResponse,
)
from scraper.infrastructure.ffvb import national as national_module
from scraper.infrastructure.ffvb.departmental import DepartmentalScraper
from scraper.infrastructure.ffvb.discovery import (
    parse_departmental_leagues,
    parse_league_pools,
    parse_national_pools,
    parse_regional_leagues,
)
from scraper.infrastructure.ffvb.models import FfvbPoolSource
from scraper.infrastructure.ffvb.national import NationalScraper
from scraper.infrastructure.ffvb.regional import RegionalScraper

FIXTURES = Path(__file__).parents[1] / "fixtures" / "ffvb"


def _fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _source() -> FfvbPoolSource:
    return FfvbPoolSource(
        code="3MA",
        name="3MA NATIONALE 3 MASCULINE POULE A",
        raw_division_name="NATIONALE 3 MASCULINE",
        season="2026/2027",
        url="https://www.ffvbbeach.org/pool",
    )


def test_index_parsers_return_typed_https_sources() -> None:
    """Protect regional and departmental names, exclusions, and secure URLs."""
    regional = parse_regional_leagues(_fixture("regional_index.html"))
    departmental = parse_departmental_leagues(_fixture("departmental_index.html"))

    assert [(item.code, item.name) for item in regional] == [
        ("LIAQ", "Nouvelle Aquitaine")
    ]
    assert [(item.code, item.name) for item in departmental] == [
        ("PTRA01", "Ain"),
        ("PTRA26", "Drôme-Ardèche"),
    ]
    assert all(item.url.startswith("https://") for item in regional + departmental)


def test_authentic_ffvb_access_pages_cover_five_pools_per_family() -> None:
    """Protect the requested five-pool discovery matrix with real provider links."""
    regional = parse_league_pools(_fixture("regional_pool_access.html"))
    departmental = parse_league_pools(_fixture("departmental_pool_access.html"))
    national = parse_national_pools(_fixture("national_pool_access.html"))

    assert [item.code for item in regional] == ["PFA", "PNF", "PFA", "1FA", "8F1"]
    assert [item.code for item in departmental] == ["JFA", "BM1", "SMA", "JF1", "QFA"]
    assert [item.code for item in national] == ["3MA", "3FA", "2MA", "2FA", "EFA"]
    assert all(
        item.url.startswith("https://") for item in regional + departmental + national
    )


def test_sources_finalize_after_bounded_typed_discovery(monkeypatch) -> None:
    """Protect source finalization after typed regional and departmental discovery."""

    async def scenario(scraper, fixture_name: str) -> list[tuple]:
        calls: list[tuple] = []
        finalizations: list[str] = []

        async def fetch(_url):
            return _fixture(fixture_name)

        async def scrape_league(**kwargs):
            calls.append(tuple(kwargs.values()))

        async def matches():
            finalizations.append("matches")

        async def associations():
            finalizations.append("associations")

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(scraper, "scrape_pools_from_league", scrape_league)
        monkeypatch.setattr(scraper, "finalize_matches_updates", matches)
        monkeypatch.setattr(scraper, "finalize_associations_updates", associations)
        await scraper.run_scraping()
        assert finalizations == ["matches", "associations"]
        return calls

    regional = asyncio.run(
        scenario(RegionalScraper(object(), object()), "regional_index.html")
    )
    departmental = asyncio.run(
        scenario(DepartmentalScraper(object(), object()), "departmental_index.html")
    )
    assert regional[0][0:2] == ("LIAQ", "Nouvelle Aquitaine")
    assert [call[0] for call in departmental] == ["PTRA01", "PTRA26"]


def test_complete_league_observation_dispatches_without_deactivation(
    monkeypatch,
) -> None:
    """Protect mapped pool assembly and complete-snapshot reconciliation."""

    async def scenario() -> None:
        existing = PoolInternalResponse(
            poolCode="3MA",
            leagueCode="ABCCS",
            season="2026/2027",
            divisionId=7,
            leagueName="Nationale",
            rawName="old",
            name="old",
            shortName="old",
            format="SIX",
            gender="M",
            id=99,
        )
        mapping = RawDivisionMappingInternalResponse(
            rawDivisionName="NATIONALE 3 MASCULINE",
            leagueCode="ABCCS",
            season="2026/2027",
            divisionId=7,
            format="SIX",
            gender="M",
        )
        dispatched: list[PoolInternalResponse] = []

        async def pools(*_args):
            return [existing]

        async def mappings(*_args):
            return [mapping]

        async def handle(_scraper, pool, _season, **_kwargs):
            dispatched.append(pool)
            return CalendarIngestionResult(pool_id=99, complete=True)

        async def unexpected(*_args):
            raise AssertionError("A complete observed pool must remain active")

        monkeypatch.setattr(ingestion, "get_pools_by_league_and_season", pools)
        monkeypatch.setattr(
            ingestion, "get_raw_division_mappings_by_league_and_season", mappings
        )
        monkeypatch.setattr(ingestion, "handle_csv_download_and_parse", handle)
        monkeypatch.setattr(ingestion, "bulk_deactivate_pools", unexpected)
        scraper = type("Scraper", (), {"session": object()})()

        await ingestion.ingest_league_pools(scraper, "ABCCS", "Nationale", (_source(),))

        assert (
            dispatched[0].divisionId,
            dispatched[0].format,
            dispatched[0].gender,
        ) == (
            7,
            "SIX",
            "M",
        )

    asyncio.run(scenario())


def test_unmapped_or_incomplete_observation_never_deactivates_pools(
    monkeypatch,
) -> None:
    """Protect destructive cleanup from configuration gaps and partial reads."""

    async def scenario() -> None:
        existing = PoolInternalResponse(
            poolCode="OLD",
            leagueCode="ABCCS",
            season="2026/2027",
            divisionId=7,
            leagueName="Nationale",
            rawName="old",
            name="old",
            shortName="old",
            format="SIX",
            gender="M",
            id=98,
        )

        async def pools(*_args):
            return [existing]

        async def mappings(*_args):
            return []

        async def create(_session, mapping):
            return mapping

        async def unexpected(*_args):
            raise AssertionError("Incomplete observations must not deactivate pools")

        monkeypatch.setattr(ingestion, "get_pools_by_league_and_season", pools)
        monkeypatch.setattr(
            ingestion, "get_raw_division_mappings_by_league_and_season", mappings
        )
        monkeypatch.setattr(ingestion, "create_raw_division_mapping", create)
        monkeypatch.setattr(ingestion, "bulk_deactivate_pools", unexpected)
        scraper = type("Scraper", (), {"session": object()})()

        await ingestion.ingest_league_pools(scraper, "ABCCS", "Nationale", (_source(),))

    asyncio.run(scenario())


def test_national_source_dispatches_typed_pools(monkeypatch) -> None:
    """Protect the national source constants and typed ingestion boundary."""

    async def scenario() -> None:
        scraper = NationalScraper(object(), object())
        observed: list[tuple] = []

        async def fetch(_url):
            return _fixture("national_pool_access.html")

        async def ingest(_scraper, code, name, sources):
            observed.append((code, name, sources))

        async def no_op():
            return None

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(national_module, "ingest_league_pools", ingest)
        monkeypatch.setattr(scraper, "finalize_matches_updates", no_op)
        monkeypatch.setattr(scraper, "finalize_associations_updates", no_op)

        await scraper.run_scraping()

        assert observed[0][0:2] == ("ABCCS", "Nationale")
        assert len(observed[0][2]) == 5

    asyncio.run(scenario())


def test_incomplete_calendar_result_suppresses_league_cleanup(monkeypatch) -> None:
    """Protect existing pools when one mapped calendar observation is incomplete."""

    async def scenario() -> None:
        existing = PoolInternalResponse(
            poolCode="OLD",
            leagueCode="ABCCS",
            season="2026/2027",
            divisionId=7,
            leagueName="Nationale",
            rawName="old",
            name="old",
            shortName="old",
            format="SIX",
            gender="M",
            id=98,
        )
        mapping = RawDivisionMappingInternalResponse(
            rawDivisionName="NATIONALE 3 MASCULINE",
            leagueCode="ABCCS",
            season="2026/2027",
            divisionId=7,
            format="SIX",
            gender="M",
        )

        async def pools(*_args):
            return [existing]

        async def mappings(*_args):
            return [mapping]

        async def handle(*_args, **_kwargs):
            return CalendarIngestionResult(pool_id=99, complete=False)

        async def unexpected(*_args):
            raise AssertionError("Partial provider data must not deactivate pools")

        monkeypatch.setattr(ingestion, "get_pools_by_league_and_season", pools)
        monkeypatch.setattr(
            ingestion, "get_raw_division_mappings_by_league_and_season", mappings
        )
        monkeypatch.setattr(ingestion, "handle_csv_download_and_parse", handle)
        monkeypatch.setattr(ingestion, "bulk_deactivate_pools", unexpected)
        scraper = type("Scraper", (), {"session": object()})()

        await ingestion.ingest_league_pools(scraper, "ABCCS", "Nationale", (_source(),))

    asyncio.run(scenario())
