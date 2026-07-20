import asyncio
from pathlib import Path

import pytest
from models.pool import Pool
from models.raw_division_mapping import RawDivisionMapping
from scrapers import departmental_scraper as departmental_module
from scrapers import national_scraper as national_module
from scrapers import regional_scraper as regional_module
from scrapers.departmental_scraper import DepartmentalScraper
from scrapers.national_scraper import NationalScraper
from scrapers.regional_scraper import RegionalScraper

FIXTURES = Path(__file__).parents[1] / "fixtures" / "ffvb"


def _fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_regional_index_discovers_supported_leagues_with_eight_way_guard(
    monkeypatch,
) -> None:
    """Protect regional league extraction, exclusions, URL downgrade, and finalization."""

    async def scenario() -> None:
        scraper = RegionalScraper(object())
        calls: list[tuple] = []
        finalizations: list[str] = []

        async def fetch(_url):
            return _fixture("regional_index.html")

        async def scrape_league(**kwargs):
            calls.append(
                (kwargs["leagueCode"], kwargs["leagueName"], kwargs["league_page_url"])
            )

        async def matches():
            finalizations.append("matches")

        async def associations():
            finalizations.append("associations")

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(scraper, "scrape_pools_from_league", scrape_league)
        monkeypatch.setattr(scraper, "finalize_matches_updates", matches)
        monkeypatch.setattr(scraper, "finalize_associations_updates", associations)

        await scraper.run_scraping()

        assert calls == [
            ("LNAQ", "Nouvelle Aquitaine", "http://www.ffvb.org/league?codent=LNAQ")
        ]
        assert finalizations == ["matches", "associations"]
        assert scraper._max_concurrency == 10

    asyncio.run(scenario())


def test_departmental_index_strips_codes_and_excludes_legacy_regions(
    monkeypatch,
) -> None:
    """Protect departmental name cleanup, exclusions, and URL downgrade."""

    async def scenario() -> None:
        scraper = DepartmentalScraper(object())
        calls: list[tuple] = []

        async def fetch(_url):
            return _fixture("departmental_index.html")

        async def scrape_league(**kwargs):
            calls.append(
                (kwargs["leagueCode"], kwargs["leagueName"], kwargs["league_page_url"])
            )

        async def no_op():
            return None

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(scraper, "scrape_pools_from_league", scrape_league)
        monkeypatch.setattr(scraper, "finalize_matches_updates", no_op)
        monkeypatch.setattr(scraper, "finalize_associations_updates", no_op)

        await scraper.run_scraping()

        assert calls == [
            ("CD75", "Paris", "http://www.ffvb.org/department?codent=CD75")
        ]

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("scraper_class", "module"),
    [(RegionalScraper, regional_module), (DepartmentalScraper, departmental_module)],
)
def test_local_league_pages_require_an_authoritative_mapped_division(
    monkeypatch,
    scraper_class,
    module,
) -> None:
    """Protect season/pool extraction and mapping-gated CSV dispatch."""

    async def scenario() -> None:
        scraper = scraper_class(object())
        dispatched: list[tuple] = []
        existing = Pool(
            "R1F",
            "LNAQ",
            "2026/2027",
            7,
            "League",
            "Poule A",
            "Poule A",
            "Poule A",
            "SIX",
            "F",
            id=99,
        )
        mapping = RawDivisionMapping(
            rawDivisionName="REGIONALE FEMININE",
            leagueCode="LNAQ",
            season="2026/2027",
            divisionId=7,
            format="SIX",
            gender="F",
        )

        async def fetch(_url):
            return _fixture("league_pools.html")

        async def get_pools(*_args):
            return [existing]

        async def get_mappings(*_args):
            return [mapping]

        async def handle(_scraper, pool, season, existing_pool, scraped_pool_ids):
            dispatched.append((pool, season, existing_pool))
            scraped_pool_ids.add(existing_pool.id)

        async def unexpected(*_args):
            raise AssertionError(
                "A successfully dispatched pool must not be deactivated"
            )

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(module, "get_pools_by_league_and_season", get_pools)
        monkeypatch.setattr(
            module, "get_raw_division_mappings_by_league_and_season", get_mappings
        )
        monkeypatch.setattr(module, "handle_csv_download_and_parse", handle)
        monkeypatch.setattr(module, "bulk_deactivate_pools", unexpected)

        await scraper.scrape_pools_from_league(
            "LNAQ", "League", "https://league.invalid"
        )

        pool, season, current = dispatched[0]
        assert (
            pool.poolCode,
            pool.rawName,
            pool.divisionId,
            pool.format,
            pool.gender,
        ) == (
            "R1F",
            "Poule A",
            7,
            "SIX",
            "F",
        )
        assert season == "2026/2027"
        assert current is existing

    asyncio.run(scenario())


def test_missing_local_mapping_is_created_and_defers_ingestion(monkeypatch) -> None:
    """Protect the two-run workflow for newly discovered raw divisions."""

    async def scenario() -> None:
        scraper = RegionalScraper(object())
        created: list[RawDivisionMapping] = []

        async def fetch(_url):
            return _fixture("league_pools.html")

        async def empty(*_args):
            return []

        async def create(_session, mapping):
            created.append(mapping)
            return mapping

        async def unexpected(*_args, **_kwargs):
            raise AssertionError("Unmapped divisions must not dispatch CSV ingestion")

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(regional_module, "get_pools_by_league_and_season", empty)
        monkeypatch.setattr(
            regional_module, "get_raw_division_mappings_by_league_and_season", empty
        )
        monkeypatch.setattr(regional_module, "create_raw_division_mapping", create)
        monkeypatch.setattr(
            regional_module, "handle_csv_download_and_parse", unexpected
        )

        await scraper.scrape_pools_from_league(
            "LNAQ", "League", "http://league.invalid"
        )

        assert [
            (item.rawDivisionName, item.leagueCode, item.season) for item in created
        ] == [("REGIONALE FEMININE", "LNAQ", "2026/2027")]

    asyncio.run(scenario())


def test_national_index_derives_season_pool_code_and_authoritative_mapping(
    monkeypatch,
) -> None:
    """Protect national source constants and mapped CSV dispatch."""

    async def scenario() -> None:
        scraper = NationalScraper(object())
        dispatched: list[tuple] = []
        mapping = RawDivisionMapping(
            rawDivisionName="N3 Masc.",
            leagueCode="ABCCS",
            season="2026/2027",
            divisionId=8,
            format="SIX",
            gender="M",
        )

        async def fetch(_url):
            return _fixture("national_index.html")

        async def pools(*_args):
            return []

        async def mappings(*_args):
            return [mapping]

        async def handle(_scraper, pool, season, **_kwargs):
            dispatched.append((pool, season))

        async def no_op(*_args):
            return None

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(scraper, "finalize_matches_updates", no_op)
        monkeypatch.setattr(scraper, "finalize_associations_updates", no_op)
        monkeypatch.setattr(national_module, "get_pools_by_league_and_season", pools)
        monkeypatch.setattr(
            national_module, "get_raw_division_mappings_by_league_and_season", mappings
        )
        monkeypatch.setattr(national_module, "handle_csv_download_and_parse", handle)

        await scraper.run_scraping()

        pool, season = dispatched[0]
        assert (pool.poolCode, pool.leagueCode, pool.leagueName) == (
            "N3A",
            "ABCCS",
            "Nationale",
        )
        assert season == "2026/2027"

    asyncio.run(scenario())
