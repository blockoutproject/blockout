"""Pure discovery parsers for public FFVB navigation pages."""

from urllib.parse import parse_qs, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup, Tag

from scraper.domain.normalization import (
    capitalize_words,
    extract_season_from_url,
    strip_department_code,
)
from scraper.infrastructure.ffvb.models import FfvbLeagueSource, FfvbPoolSource

_EXCLUDED_LEAGUES = {"LIGU", "LIGY", "LIMART", "LIMY", "LIRE"}
_FFVB_RESULTS_BASE_URL = "https://www.ffvbbeach.org/ffvbapp/resu/"


def parse_regional_leagues(html: str) -> tuple[FfvbLeagueSource, ...]:
    """Parse supported regional leagues from the FFVolley index."""
    soup = BeautifulSoup(html, "html.parser")
    leagues: list[FfvbLeagueSource] = []
    for table in soup.find_all(
        "table", class_=["tableau_bleu", "tableau_rouge", "tableau_violet"]
    ):
        name_cell = table.find("td", style="text-align: center;")
        link = table.find("a", href=lambda value: value and "codent=" in value)
        if not isinstance(name_cell, Tag) or not isinstance(link, Tag):
            continue
        source = _league_source(
            link.get("href", ""), capitalize_words(name_cell.get_text(strip=True))
        )
        if source and source.code not in _EXCLUDED_LEAGUES:
            leagues.append(source)
    return tuple(leagues)


def parse_departmental_leagues(html: str) -> tuple[FfvbLeagueSource, ...]:
    """Parse supported departmental committees from the FFVolley index."""
    soup = BeautifulSoup(html, "html.parser")
    leagues: list[FfvbLeagueSource] = []
    seen: set[str] = set()
    for item in soup.select(
        "table.tableau_bleu li, table.tableau_rouge li, table.tableau_violet li"
    ):
        link = item.find("a", href=lambda value: value and "codent=" in value)
        if not isinstance(link, Tag):
            continue
        source = _league_source(
            link.get("href", ""),
            capitalize_words(strip_department_code(item.get_text(strip=True))),
        )
        if source and source.code not in _EXCLUDED_LEAGUES and source.code not in seen:
            leagues.append(source)
            seen.add(source.code)
    return tuple(leagues)


def parse_league_pools(html: str) -> tuple[FfvbPoolSource, ...]:
    """Parse and de-duplicate the current pools from one FFVB league menu."""
    soup = BeautifulSoup(html, "html.parser")
    pools: list[FfvbPoolSource] = []
    seen: set[tuple[str, str, str]] = set()
    for link in soup.select('ul#menu > li > ul > li > ul > li > a[href*="poule="]'):
        href = link.get("href", "")
        query = parse_qs(urlparse(href).query)
        league_code = query.get("codent", [""])[0]
        season = query.get("saison", [""])[0]
        code = query.get("poule", [""])[0]
        key = (league_code, season, code)
        if not season or not code or key in seen:
            continue
        parent = link.find_parent("ul")
        division = (
            parent.find_previous_sibling("a") if isinstance(parent, Tag) else None
        )
        pools.append(
            FfvbPoolSource(
                code=code,
                name=link.get_text(strip=True),
                raw_division_name=(
                    division.get_text(strip=True) if isinstance(division, Tag) else ""
                ),
                season=season,
                url=_secure_url(urljoin(_FFVB_RESULTS_BASE_URL, href)),
            )
        )
        seen.add(key)
    return tuple(pools)


def parse_national_pools(html: str) -> tuple[FfvbPoolSource, ...]:
    """Parse national pool links and their season from the FFVolley index."""
    soup = BeautifulSoup(html, "html.parser")
    pools: list[FfvbPoolSource] = []
    seen: set[tuple[str, str]] = set()
    for link in soup.find_all("a", href=lambda value: value and value.endswith(".htm")):
        if not isinstance(link, Tag):
            continue
        href = link.get("href", "")
        season = extract_season_from_url(href)
        code = href.rsplit("_", 1)[-1].removesuffix(".htm").upper()
        key = (season or "", code)
        if not season or not code or key in seen:
            continue
        name = link.get_text(strip=True)
        pools.append(
            FfvbPoolSource(
                code=code,
                name=name,
                raw_division_name=name,
                season=season,
                url=_secure_url(href),
            )
        )
        seen.add(key)
    return tuple(pools)


def _league_source(href: str, name: str) -> FfvbLeagueSource | None:
    query = parse_qs(urlparse(href).query)
    code = query.get("codent", [""])[0]
    if not code:
        return None
    return FfvbLeagueSource(code=code, name=name, url=_secure_url(href))


def _secure_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "http":
        return url
    return urlunparse(parsed._replace(scheme="https"))
