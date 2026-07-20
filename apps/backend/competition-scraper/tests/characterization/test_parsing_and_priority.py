import asyncio
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

import models.scraper as scraper_module
from bs4 import BeautifulSoup
from models.association_stats import AssociationStats
from models.enums.datasource_priority import DataSourcePriority
from models.match import Match
from models.scraper import Scraper
from utils.file_utils import parse_csv_from_content, validate_columns
from utils.html_utils import parse_float, parse_stat_line
from utils.match_utils import (
    compute_volleyball_match_stats,
    is_anomalous_set_format,
    validate_set_format,
    validate_set_score_format,
)
from utils.team_utils import get_full_name, get_short_name, normalize
from utils.utils import parse_date, strip_department_code

FIXTURES = Path(__file__).parents[1] / "fixtures"


class DummyScraper(Scraper):
    """Concrete legacy base used to protect cache policies."""

    async def run_scraping(self) -> None:
        return None


def _match(**overrides) -> Match:
    values = {
        "id": 1,
        "matchCode": "M001",
        "leagueCode": "LNAQ",
        "poolId": 10,
        "teamIdA": 20,
        "teamIdB": 30,
        "matchDate": datetime(2026, 10, 4, 16, 30, tzinfo=UTC),
        "season": "2026/2027",
        "set": "3-1",
        "score": "25-20,25-22,20-25,25-18",
        "venue": "Old venue",
        "firstReferee": "Old A",
        "secondReferee": "Old B",
        "liveCode": None,
    }
    values.update(overrides)
    return Match(**values)


def test_csv_parser_protects_headers_and_normalized_rows() -> None:
    """Protect the FFVB semicolon schema and provider-owned row names."""
    content = (FIXTURES / "ffvb" / "calendar.csv").read_text(encoding="utf-8")

    rows = list(parse_csv_from_content(content))

    assert rows == [
        {
            "leagueCode": "LNAQ",
            "matchCode": "M001",
            "club_a_id": "club-a",
            "club_b_id": "club-b",
            "team_a_name": "TOURS VB",
            "team_b_name": "PARIS",
            "matchDate": "2026-10-04",
            "match_time": "18:30",
            "set": "3/1",
            "score": "25-20,25-22,20-25,25-18",
            "venue": "GYMNASE CENTRAL",
            "firstReferee": "ARBITRE A",
            "secondReferee": "ARBITRE B",
        }
    ]


def test_csv_parser_rejects_a_missing_required_column() -> None:
    """Protect fail-fast behavior for provider schema drift."""
    try:
        validate_columns({"Match"}, {"Match", "Date"})
    except ValueError as error:
        assert "Date" in str(error)
    else:
        raise AssertionError("Missing CSV columns must fail")


def test_html_rank_parser_preserves_ratios_and_stat_columns() -> None:
    """Protect the nineteen-column FFVB ranking table contract."""
    html = (FIXTURES / "ffvb" / "stats.html").read_text(encoding="utf-8")
    cells = BeautifulSoup(html, "html.parser").find_all("tr")[1].find_all("td")

    stats = parse_stat_line(cells)

    assert stats.points == 9
    assert stats.played == 3
    assert stats.winsThreeToZero == 1
    assert stats.wonSets == 9
    assert stats.coefSets == 3.0
    assert stats.coefPoints == 1000.0
    assert parse_float("bad") == 0.0


def test_aliases_normalization_and_department_names_remain_stable() -> None:
    """Protect production aliases and lightweight name normalization."""
    assert get_full_name("Tours VB", "M") == "Tours Volley-Ball"
    assert get_short_name("Tours VB", "M") == "TVB"
    assert get_full_name("Unknown Club", "M") == "Unknown Club"
    assert normalize("  St.-Nazaire  ") == "st nazaire"
    assert strip_department_code("07/26 Drôme-Ardèche") == "Drôme-Ardèche"


def test_date_and_score_helpers_preserve_timezone_and_validation_rules() -> None:
    """Protect Paris-to-UTC conversion and score validation fallbacks."""
    assert parse_date("2026-10-04", "18:30") == datetime(
        2026, 10, 4, 16, 30, tzinfo=UTC
    )
    assert parse_date("2026-10-04", "00:00") == datetime(2026, 10, 4, 0, 0, tzinfo=UTC)
    assert parse_date("bad", "18:30") is None
    assert validate_set_format("3-1") == "3-1"
    assert validate_set_format("F-0") == "0-0"
    assert validate_set_score_format("25-8") == "25-8"
    assert validate_set_score_format("125-8") == "0-0"
    assert is_anomalous_set_format("F-0") is True


def test_match_stat_calculation_preserves_ranking_and_point_totals() -> None:
    """Protect the dormant deterministic match-stat policy for standard scores."""
    home, away = compute_volleyball_match_stats("3", "2", "25-20,20-25,15-12")

    assert (home.played, home.wins, home.points) == (1, 1, 2)
    assert (away.played, away.losses, away.points) == (1, 1, 1)
    assert (home.wonPoints, home.lostPoints) == (60, 57)
    assert (away.wonPoints, away.lostPoints) == (57, 60)


def test_data_source_priority_updates_only_the_owned_match_fields() -> None:
    """Protect FFVB, LNV XML, and LNV HTML field ownership."""
    scraper = DummyScraper(None, "priority", priority_validation_enabled=True)
    existing = _match()
    scraper._matches_cache[("LNAQ", "M001")] = (
        existing,
        replace(existing),
        [],
        DataSourcePriority.DB,
    )

    ffvb = _match(
        matchDate=datetime(2030, 1, 1, tzinfo=UTC),
        set="0-3",
        score="old",
        venue="New venue",
        firstReferee="New A",
    )
    scraper.schedule_match_changes(ffvb, "CSV", DataSourcePriority.FFVB)
    current = scraper._matches_cache[("LNAQ", "M001")][1]
    assert current.venue == "New venue"
    assert current.firstReferee == "New A"
    assert current.matchDate == existing.matchDate
    assert current.set == "3-1"

    xml = _match(
        matchDate=datetime(2026, 10, 5, tzinfo=UTC),
        set="3-0",
        score="25-20,25-18,25-19",
        venue="Ignored XML venue",
    )
    scraper.schedule_match_changes(xml, "LNV-XML", DataSourcePriority.LNV_XML)
    current = scraper._matches_cache[("LNAQ", "M001")][1]
    assert current.matchDate == xml.matchDate
    assert current.set == "3-0"
    assert current.venue == "New venue"

    html = _match(liveCode=98765, venue="Ignored HTML venue")
    scraper.schedule_match_changes(html, "LNV-Live", DataSourcePriority.LNV_HTML)
    current = scraper._matches_cache[("LNAQ", "M001")][1]
    assert current.liveCode == 98765
    assert current.venue == "New venue"
    assert list(DataSourcePriority) == [
        DataSourcePriority.DB,
        DataSourcePriority.FFVB,
        DataSourcePriority.LNV_XML,
        DataSourcePriority.LNV_HTML,
    ]


def test_disabled_priority_validation_replaces_every_scraped_field() -> None:
    """Protect the non-professional all-field merge policy."""
    scraper = DummyScraper(None, "no-priority", priority_validation_enabled=False)
    existing = _match(active=False)
    scraper._matches_cache[("LNAQ", "M001")] = (
        existing,
        replace(existing),
        [],
        DataSourcePriority.DB,
    )
    replacement = _match(
        matchDate=datetime(2027, 1, 1, tzinfo=UTC),
        set="3-0",
        liveCode=5,
        venue="Replacement",
    )

    scraper.schedule_match_changes(replacement, "CSV", DataSourcePriority.FFVB)

    _, updated, changes, priority = scraper._matches_cache[("LNAQ", "M001")]
    assert updated.active is True
    assert updated.matchDate == replacement.matchDate
    assert updated.liveCode == 5
    assert updated.venue == "Replacement"
    assert any("Match réactivé" in change for change in changes)
    assert priority == DataSourcePriority.FFVB


def test_association_finalization_computes_coefficients_and_clears_cache(
    monkeypatch,
) -> None:
    """Protect changed-only writes, coefficient fallbacks, and cache lifecycle."""

    async def scenario() -> None:
        writes: list[tuple] = []

        async def update(_session, pool_id, team_id, stats):
            writes.append((pool_id, team_id, stats))

        monkeypatch.setattr(scraper_module, "update_team_association_stats", update)
        scraper = DummyScraper(None, "stats")
        stats = AssociationStats(wonSets=9, lostSets=3, wonPoints=250, lostPoints=0)
        scraper._associations_cache[(10, 20)] = (None, stats)

        await scraper.finalize_associations_updates()

        assert writes[0][:2] == (10, 20)
        assert writes[0][2].coefSets == 3.0
        assert writes[0][2].coefPoints == 1000.0
        assert scraper._associations_cache == {}

    asyncio.run(scenario())
