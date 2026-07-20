import asyncio
import xml.etree.ElementTree as ET
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from models.enums.datasource_priority import DataSourcePriority
from models.match import Match
from models.pool import Pool
from models.team import Team
from scrapers import pro_scraper as pro_module
from scrapers.pro_scraper import ProScraper

FIXTURES = Path(__file__).parents[1] / "fixtures" / "lnv"


def _pool() -> Pool:
    return Pool(
        poolCode="MSL",
        leagueCode="AALNV",
        season="2026/2027",
        divisionId=10,
        leagueName="Pro",
        rawName="Marmara SpikeLigue",
        name="Marmara SpikeLigue",
        shortName="MSL",
        format="SIX",
        gender="M",
        id=1,
    )


def _match(**overrides) -> Match:
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
    return Match(**values)


def _team(identifier: int, name: str) -> Team:
    return Team(
        id=identifier,
        clubId=f"club-{identifier}",
        rawName=name,
        name=name,
        shortName=name,
        leagueCode="AALNV",
        divisionId=10,
        season="2026/2027",
        format="SIX",
        gender="M",
    )


def test_professional_source_catalog_remains_explicit_and_season_bound() -> None:
    """Protect configured pro competitions, source URLs, and local priority mode."""
    scraper = ProScraper(None)

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
        scraper = ProScraper(object())
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
        scraper = ProScraper(None)
        existing = _match(
            matchDate=datetime(2020, 1, 1, tzinfo=UTC), set=None, score=None
        )
        scraper._matches_cache[("AALNV", "M001")] = (
            existing,
            replace(existing),
            [],
            DataSourcePriority.FFVB,
        )
        root = ET.fromstring((FIXTURES / "matches.xml").read_text(encoding="utf-8"))

        await scraper.process_xml_matches(root, 1)

        _, updated, changes, priority = scraper._matches_cache[("AALNV", "M001")]
        assert updated.matchDate == datetime(2026, 10, 4, 16, 30, tzinfo=UTC)
        assert updated.set == "3-1"
        assert updated.score == "25-20,25-22,20-25,25-18"
        assert updated.venue == "Arena"
        assert any("[LNV-XML] matchDate" in change for change in changes)
        assert priority == DataSourcePriority.LNV_XML

    asyncio.run(scenario())


def test_lnv_rank_xml_replaces_complete_association_stats(monkeypatch) -> None:
    """Protect rank parsing, alias lookup, team resolution, and replacement semantics."""

    async def scenario() -> None:
        scraper = ProScraper(object())
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
        assert (stats.played, stats.wins, stats.losses, stats.points) == (3, 3, 0, 9)
        assert (stats.wonSets, stats.lostSets) == (9, 3)
        assert (stats.wonPoints, stats.lostPoints) == (250, 210)
        # The cache replacement copies raw counters; finalization recomputes coefficients.
        assert (stats.coefSets, stats.coefPoints) == (0.0, 0.0)

    asyncio.run(scenario())


def test_lnv_live_html_resolves_teams_and_adds_only_the_live_code(monkeypatch) -> None:
    """Protect DataProject identifiers, two-step indexes, and date-based match lookup."""

    async def scenario() -> None:
        scraper = ProScraper(object())
        existing = _match(liveCode=None)
        scraper._matches_cache[("AALNV", "M001")] = (
            existing,
            replace(existing),
            [],
            DataSourcePriority.LNV_XML,
        )

        async def fetch(_url):
            return (FIXTURES / "live.html").read_text(encoding="utf-8")

        async def find_team(_session, _division, _format, _gender, _season, name):
            return _team(101, name) if name == "TOURS VB" else _team(102, name)

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(pro_module, "get_full_name", lambda name, _gender: name)
        monkeypatch.setattr(
            pro_module, "find_team_by_name_in_division_format_gender_season", find_team
        )

        await scraper.add_match_live_code("https://live.invalid", _pool())

        _, updated, changes, priority = scraper._matches_cache[("AALNV", "M001")]
        assert updated.liveCode == 98765
        assert updated.matchDate == existing.matchDate
        assert updated.venue == "Arena"
        assert any("[LNV-Live] liveCode" in change for change in changes)
        assert priority == DataSourcePriority.LNV_HTML

    asyncio.run(scenario())


def test_malformed_or_missing_professional_inputs_are_isolated(monkeypatch) -> None:
    """Protect pool-local failure isolation for malformed XML and missing HTML identifiers."""

    async def scenario() -> None:
        scraper = ProScraper(object())
        events: list[dict] = []

        async def fetch(url):
            return "<broken" if "xml" in url else "<html></html>"

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(
            pro_module, "log_event", lambda **event: events.append(event)
        )

        await scraper.parse_and_update_matches("xml-matches", "xml-rank", _pool())
        await scraper.add_match_live_code("html-live", _pool())

        assert [event["action"] for event in events] == [
            "parse_and_update_matches_error",
            "missing_main_id",
        ]

    asyncio.run(scenario())
