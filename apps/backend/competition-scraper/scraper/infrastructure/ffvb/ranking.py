"""Parse FFVB ranking pages into provider-owned records."""

from bs4 import BeautifulSoup, Tag

from scraper.application.source import Scraper
from scraper.domain.models import Pool
from scraper.infrastructure.ffvb.models import FfvbRanking

_RANKING_HEADERS = (
    "Points",
    "Jou.",
    "Gag.",
    "Per.",
    "F.",
    "3-0",
    "3-1",
    "3-2",
    "2-3",
    "1-3",
    "0-3",
    "Set.P",
    "Set.C",
    "Coeff.S",
    "Pts.P",
    "Pts.C",
    "Coeff.P",
)
_COMPACT_RANKING_HEADERS = (
    "Points",
    "Jou.",
    "Gag.",
    "Per.",
    "F.",
    "Set.P",
    "Set.C",
    "Coeff.S",
    "Pts.P",
    "Pts.C",
    "Coeff.P",
)


def parse_int(text: str) -> int:
    """Parse an FFVB integer cell, falling back to zero."""
    try:
        return int(text.strip()) if text else 0
    except ValueError:
        return 0


def parse_float(text: str) -> float:
    """Parse an FFVB decimal cell and its MAX sentinel."""
    if not text:
        return 0.0
    value = text.strip()
    if value == "MAX":
        return 1000.0
    try:
        return float(value.replace(",", "."))
    except ValueError:
        return 0.0


def parse_stat_line(columns: list[Tag]) -> FfvbRanking:
    """Parse one nineteen-column ranking row."""
    return FfvbRanking(
        team_name=columns[1].get_text(strip=True),
        points=parse_int(columns[2].get_text(strip=True)),
        played=parse_int(columns[3].get_text(strip=True)),
        wins=parse_int(columns[4].get_text(strip=True)),
        losses=parse_int(columns[5].get_text(strip=True)),
        wins_three_to_zero=parse_int(columns[7].get_text(strip=True)),
        wins_three_to_one=parse_int(columns[8].get_text(strip=True)),
        wins_three_to_two=parse_int(columns[9].get_text(strip=True)),
        losses_two_to_three=parse_int(columns[10].get_text(strip=True)),
        losses_one_to_three=parse_int(columns[11].get_text(strip=True)),
        losses_zero_to_three=parse_int(columns[12].get_text(strip=True)),
        won_sets=parse_int(columns[13].get_text(strip=True)),
        lost_sets=parse_int(columns[14].get_text(strip=True)),
        coefficient_sets=parse_float(columns[15].get_text(strip=True)),
        won_points=parse_int(columns[16].get_text(strip=True)),
        lost_points=parse_int(columns[17].get_text(strip=True)),
        coefficient_points=parse_float(columns[18].get_text(strip=True)),
    )


def parse_rankings(html: str) -> tuple[FfvbRanking, ...]:
    """Find the ranking table by its semantic headers and parse its rows."""
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        rows = [
            row for row in table.find_all("tr") if row.find_parent("table") is table
        ]
        if not rows:
            continue
        header = tuple(
            cell.get_text(strip=True)
            for cell in rows[0].find_all("td", recursive=False)
        )
        full = _contains_headers(header, _RANKING_HEADERS)
        compact = _contains_headers(header, _COMPACT_RANKING_HEADERS)
        if not full and not compact:
            continue
        rankings = []
        for row in rows[1:]:
            columns = row.find_all("td", recursive=False)
            if full and len(columns) >= 19:
                rankings.append(parse_stat_line(columns))
            elif compact and len(columns) >= 13:
                rankings.append(_parse_compact_stat_line(columns))
        return tuple(rankings)
    return ()


async def extract_club_stats_list(
    scraper: Scraper, raw_season: str, pool: Pool
) -> tuple[FfvbRanking, ...]:
    """Download and parse the authoritative ranking for one pool."""
    url = (
        "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php"
        f"?saison={raw_season}&codent={pool.league_code}&poule={pool.pool_code}"
    )
    return parse_rankings(await scraper.fetch(url))


def _contains_headers(header: tuple[str, ...], expected: tuple[str, ...]) -> bool:
    return any(
        header[index : index + len(expected)] == expected
        for index in range(len(header) - len(expected) + 1)
    )


def _parse_compact_stat_line(columns: list[Tag]) -> FfvbRanking:
    return FfvbRanking(
        team_name=columns[1].get_text(strip=True),
        points=parse_int(columns[2].get_text(strip=True)),
        played=parse_int(columns[3].get_text(strip=True)),
        wins=parse_int(columns[4].get_text(strip=True)),
        losses=parse_int(columns[5].get_text(strip=True)),
        wins_three_to_zero=0,
        wins_three_to_one=0,
        wins_three_to_two=0,
        losses_two_to_three=0,
        losses_one_to_three=0,
        losses_zero_to_three=0,
        won_sets=parse_int(columns[7].get_text(strip=True)),
        lost_sets=parse_int(columns[8].get_text(strip=True)),
        coefficient_sets=parse_float(columns[9].get_text(strip=True)),
        won_points=parse_int(columns[10].get_text(strip=True)),
        lost_points=parse_int(columns[11].get_text(strip=True)),
        coefficient_points=parse_float(columns[12].get_text(strip=True)),
    )
