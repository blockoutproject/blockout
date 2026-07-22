import asyncio
import xml.etree.ElementTree as ET
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from scraper.application.models import Pool, Team
from scraper.domain.data_source_priority import DataSourcePriority
from scraper.infrastructure.blockout.match import MatchInternalResponse
from scraper.infrastructure.lnv import professional as pro_module
from scraper.infrastructure.lnv.professional import ProScraper

FIXTURES = Path(__file__).parents[1] / "fixtures" / "lnv"


def _pool() -> Pool:
    return Pool(
        pool_code="MSL",
        league_code="AALNV",
        season="2026/2027",
        division_id=10,
        league_name="Pro",
        raw_name="Marmara SpikeLigue",
        name="Marmara SpikeLigue",
        short_name="MSL",
        format="SIX",
        gender="M",
        id=1,
    )


def _match(**overrides) -> MatchInternalResponse:
    values = {
        "id": 5,
        "matchCode": "M001",
        "leagueCode": "AALNV",
        "poolId": 1,
        "teamIdA": 101,
        "teamIdB": 102,
        "matchDate": datetime(2026, 10, 4, 16, 30, tzinfo=UTC),
        "season": "2026/2027",
        "venue": "Arena",
    }
    values.update(overrides)
    return MatchInternalResponse(**values)


def _team(identifier: int, name: str) -> Team:
    return Team(
        id=identifier,
        club_id=f"club-{identifier}",
        raw_name=name,
        name=name,
        short_name=name,
        league_code="AALNV",
        division_id=10,
        season="2026/2027",
        format="SIX",
        gender="M",
    )


def test_professional_source_catalog_remains_explicit_and_season_bound() -> None:
    """Protect configured pro competitions, source URLs, and local priority mode."""
    scraper = ProScraper(None, None, None, object())

    assert scraper.raw_season == "2026/2027"
    assert scraper.leagueCode == "AALNV"
    assert scraper.priority_validation_enabled is True
    assert [pool["poolCode"] for pool in scraper.pools_json] == [
        "MSL",
        "PAZ",
        "LBM",
        "SPS",
        "FAZ",
    ]
    assert all(
        pool["lnv_url"].startswith("https://lnv-web.dataproject.com/")
        for pool in scraper.pools_json
    )
    assert all(
        pool["lnv_xml_matches_url"].startswith("https://www.lnv.fr/xml/")
        for pool in scraper.pools_json
    )


def test_professional_chain_keeps_csv_then_xml_then_live_order(monkeypatch) -> None:
    """Protect source ordering within one professional pool."""

    async def scenario() -> None:
        scraper = ProScraper(object(), object(), None, object())
        order: list[str] = []

        async def csv(*_args, **_kwargs):
            order.append("csv")

        async def xml(*_args):
            order.append("xml")

        async def live(*_args):
            order.append("live")

        monkeypatch.setattr(pro_module, "handle_csv_download_and_parse", csv)
        monkeypatch.setattr(scraper, "parse_and_update_matches", xml)
        monkeypatch.setattr(scraper, "add_match_live_code", live)

        await scraper.execute_task_chain(
            _pool(),
            None,
            "2026/2027",
            "https://live.invalid",
            "https://matches.invalid",
            "https://rank.invalid",
        )

        assert order == ["csv", "xml", "live"]

    asyncio.run(scenario())


def test_lnv_match_xml_updates_date_set_and_score_in_utc() -> None:
    """Protect XML parsing, invalid-match skipping, and LNV XML ownership."""

    async def scenario() -> None:
        scraper = ProScraper(None, None, None, object())
        existing = _match(
            matchCode="LAM001",
            matchDate=datetime(2020, 1, 1, tzinfo=UTC),
            set=None,
            score=None,
        )
        scraper._matches_cache[("AALNV", "LAM001")] = (
            existing,
            replace(existing),
            [],
            DataSourcePriority.FFVB,
        )
        root = ET.fromstring((FIXTURES / "matches.xml").read_text(encoding="utf-8"))

        await scraper.process_xml_matches(root, 1)

        _, updated, changes, priority = scraper._matches_cache[("AALNV", "LAM001")]
        assert updated.matchDate == datetime(2022, 9, 30, 18, 0, tzinfo=UTC)
        assert updated.set == "1-3"
        assert updated.score == "17-25,25-22,22-25,19-25"
        assert updated.venue == "Arena"
        assert any("[LNV-XML] matchDate" in change for change in changes)
        assert priority == DataSourcePriority.LNV_XML

    asyncio.run(scenario())


def test_lnv_rank_xml_replaces_complete_association_stats(monkeypatch) -> None:
    """Protect rank parsing, alias lookup, team resolution, and replacement semantics."""

    async def scenario() -> None:
        scraper = ProScraper(object(), object(), None, object())
        pool = _pool()

        async def find_team(*_args):
            return _team(101, "Tours Volley-Ball")

        monkeypatch.setattr(
            pro_module, "get_full_name", lambda _name, _gender: "Tours Volley-Ball"
        )
        monkeypatch.setattr(
            pro_module, "find_team_by_name_in_division_format_gender_season", find_team
        )
        root = ET.fromstring((FIXTURES / "rank.xml").read_text(encoding="utf-8"))

        await scraper.process_xml_rank(root, pool)

        original, stats = scraper._associations_cache[(1, 101)]
        assert original is None
        assert (stats.played, stats.wins, stats.losses, stats.points) == (18, 15, 3, 44)
        assert (stats.won_sets, stats.lost_sets) == (48, 18)
        assert (stats.won_points, stats.lost_points) == (1584, 1453)
        # The cache replacement copies raw counters; finalization recomputes coefficients.
        assert (stats.coefficient_sets, stats.coefficient_points) == (0.0, 0.0)

    asyncio.run(scenario())


def test_lnv_live_html_resolves_teams_and_adds_only_the_live_code(monkeypatch) -> None:
    """Protect DataProject identifiers, two-step indexes, and date-based match lookup."""

    async def scenario() -> None:
        scraper = ProScraper(object(), object(), None, object())
        existing = _match(
            liveCode=None,
            matchDate=datetime(2026, 3, 25, 18, 0, tzinfo=UTC),
        )
        scraper._matches_cache[("AALNV", "M001")] = (
            existing,
            replace(existing),
            [],
            DataSourcePriority.LNV_XML,
        )

        async def fetch(_url):
            return (FIXTURES / "live.html").read_text(encoding="utf-8")

        team_reads = 0

        async def get_teams(*_args):
            nonlocal team_reads
            team_reads += 1
            return [_team(101, "Cannes"), _team(102, "Nice")]

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(pro_module, "get_full_name", lambda name, _gender: name)
        monkeypatch.setattr(pro_module, "get_teams", get_teams)

        await scraper.add_match_live_code("https://live.invalid", _pool())

        _, updated, changes, priority = scraper._matches_cache[("AALNV", "M001")]
        assert updated.liveCode == 9572
        assert updated.matchDate == existing.matchDate
        assert updated.venue == "Arena"
        assert any("[LNV-Live] liveCode" in change for change in changes)
        assert priority == DataSourcePriority.LNV_HTML
        assert team_reads == 1

    asyncio.run(scenario())


def test_professional_parser_and_identifier_failures_are_isolated(monkeypatch) -> None:
    """Protect pool-local isolation with injected technical failures."""

    async def scenario() -> None:
        scraper = ProScraper(object(), object(), None, object())
        events: list[dict] = []

        async def fetch(url):
            fixture = "matches.xml" if "xml" in url else "live.html"
            return (FIXTURES / fixture).read_text(encoding="utf-8")

        def raise_parse_error(_content):
            raise ET.ParseError("injected parser failure")

        def fail_live_parse(_html):
            raise ValueError("injected live parser failure")

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(pro_module.ET, "fromstring", raise_parse_error)
        monkeypatch.setattr(pro_module, "parse_live_matches", fail_live_parse)
        monkeypatch.setattr(
            pro_module, "log_event", lambda **event: events.append(event)
        )

        await scraper.parse_and_update_matches("xml-matches", "xml-rank", _pool())
        await scraper.add_match_live_code("html-live", _pool())

        assert [event["action"] for event in events] == [
            "parse_and_update_matches_error",
            "parse_live_html_error",
        ]

    asyncio.run(scenario())


def test_shared_professional_live_page_is_fetched_once(monkeypatch) -> None:
    """Protect the per-run cache used by pools sharing one Data Project page."""

    async def scenario() -> None:
        scraper = ProScraper(object(), object(), None, object())
        fetches = 0

        async def fetch(_url):
            nonlocal fetches
            fetches += 1
            return (FIXTURES / "live.html").read_text(encoding="utf-8")

        async def get_teams(*_args):
            return []

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(pro_module, "get_teams", get_teams)

        await asyncio.gather(
            scraper.add_match_live_code("https://live.invalid", _pool()),
            scraper.add_match_live_code("https://live.invalid", _pool()),
        )

        assert fetches == 1

    asyncio.run(scenario())


def test_professional_live_page_cache_is_reset_between_runs(monkeypatch) -> None:
    """Protect fresh provider observations across separate scheduled runs."""

    async def scenario() -> None:
        scraper = ProScraper(object(), object(), None, object())
        scraper._live_documents["https://live.invalid"] = "stale"

        async def empty_read(*_args):
            return []

        async def finalize() -> None:
            return None

        monkeypatch.setattr(pro_module, "get_pools_by_league_and_season", empty_read)
        monkeypatch.setattr(
            pro_module,
            "get_raw_division_mappings_by_league_and_season",
            empty_read,
        )
        monkeypatch.setattr(scraper, "finalize_matches_updates", finalize)
        monkeypatch.setattr(scraper, "finalize_associations_updates", finalize)

        await scraper.run_scraping()

        assert scraper._live_documents == {}

    asyncio.run(scenario())
