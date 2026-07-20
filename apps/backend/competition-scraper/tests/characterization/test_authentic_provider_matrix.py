"""Offline matrix built exclusively from authentic public provider responses."""

from pathlib import Path

import pytest
from scraper.infrastructure.ffvb.calendar import parse_csv_from_content
from scraper.infrastructure.ffvb.ranking import parse_rankings
from scraper.infrastructure.lnv.parsers import parse_live_matches

FIXTURES = Path(__file__).parents[1] / "fixtures"
FFVB_CALENDARS = FIXTURES / "ffvb" / "calendars"
FFVB_POOL_PAGES = FIXTURES / "ffvb" / "pool-pages"
LNV = FIXTURES / "lnv"


@pytest.mark.parametrize("family", ["departmental", "regional", "national"])
def test_five_authentic_calendar_exports_per_ffvb_family(family: str) -> None:
    """Protect typed parsing across the requested fifteen real FFVB exports."""
    fixtures = sorted(FFVB_CALENDARS.glob(f"{family}-*.csv"))

    assert len(fixtures) == 5
    for fixture in fixtures:
        snapshot = parse_csv_from_content(fixture.read_text(encoding="utf-8"))
        assert snapshot.complete is True
        assert len(snapshot.matches) == 3
        assert all(match.match_code for match in snapshot.matches)
        assert all(
            match.home_team_name and match.away_team_name for match in snapshot.matches
        )


@pytest.mark.parametrize("family", ["departmental", "regional", "national"])
def test_five_authentic_pool_pages_per_ffvb_family(family: str) -> None:
    """Protect semantic ranking discovery on the fifteen matching pool pages."""
    fixtures = sorted(FFVB_POOL_PAGES.glob(f"{family}-*.html"))

    assert len(fixtures) == 5
    parsed = [
        parse_rankings(fixture.read_text(encoding="utf-8")) for fixture in fixtures
    ]
    assert all(all(ranking.team_name for ranking in rankings) for rankings in parsed)
    if family != "national":
        assert any(rankings for rankings in parsed)


@pytest.mark.parametrize(
    "fixture_name",
    ["competition-124.html", "competition-125.html", "competition-126.html"],
)
def test_three_authentic_professional_access_pages(fixture_name: str) -> None:
    """Protect semantic Data Project parsing across all three live competitions."""
    matches = parse_live_matches((LNV / fixture_name).read_text(encoding="utf-8"))

    assert len(matches) == 3
    assert len({match.live_code for match in matches}) == 3
    assert all(match.home_name and match.guest_name for match in matches)


def test_authentic_compact_departmental_ranking_is_supported() -> None:
    """Protect two-set departmental tables that omit three-set breakdown columns."""
    fixture = FFVB_POOL_PAGES / "departmental-ptra69-bm1.html"

    rankings = parse_rankings(fixture.read_text(encoding="utf-8"))

    assert rankings[0].team_name == "VILLEFRANCHE G1"
    assert (rankings[0].points, rankings[0].played, rankings[0].won_sets) == (
        32,
        16,
        32,
    )


def test_authentic_nested_calendar_rows_are_not_rankings() -> None:
    """Ignore calendar rows nested by the provider's malformed table layout."""
    fixture = FFVB_POOL_PAGES / "nested-layout-ptra69-bm1.html"

    rankings = parse_rankings(fixture.read_text(encoding="utf-8"))

    assert [ranking.team_name for ranking in rankings] == [
        "VILLEFRANCHE G1",
        "ASUL G1",
    ]
