"""Pure parsers for LNV XML and Data Project HTML documents."""

import re
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup, Tag
from dataclasses import dataclass
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from scraper.domain.match import validate_set_format, validate_set_score_format
from scraper.infrastructure.blockout.association_stats import (
    UpdateAssociationStatsInternalRequest,
)


@dataclass(frozen=True)
class LnvMatch:
    """Provider-owned match values read from one LNV XML element."""

    code: str
    match_date: datetime
    set_score: str | None
    points_score: str


@dataclass(frozen=True)
class LnvRanking:
    """Provider-owned ranking values read from one LNV XML element."""

    team_name: str
    stats: UpdateAssociationStatsInternalRequest


@dataclass(frozen=True)
class LnvLiveMatch:
    """Provider-owned live-link values read from one Data Project block."""

    live_code: int
    home_name: str
    guest_name: str
    match_date: date


def parse_matches(root: ET.Element) -> list[LnvMatch]:
    """Parse every usable match from an LNV calendar document."""
    matches = []
    for element in root.findall(".//Match"):
        code = (element.findtext("CodeMatch") or "").strip()
        if not code:
            continue
        date_value = (element.findtext("Date") or "01-01-1970").strip()
        time_value = (element.findtext("Heure") or "00:00:00").strip()
        local_time = datetime.strptime(
            f"{date_value} {time_value}", "%d-%m-%Y %H:%M:%S"
        ).replace(tzinfo=ZoneInfo("Europe/Paris"))
        set_score = validate_set_format(element.findtext("Score"))
        points = [
            score
            for index in range(1, 6)
            if (score := validate_set_score_format(element.findtext(f"Set{index}")))
               != "0-0"
        ]
        matches.append(
            LnvMatch(
                code=code,
                match_date=local_time.astimezone(UTC),
                set_score=set_score if set_score != "0-0" else None,
                points_score=",".join(points),
            )
        )
    return matches


def parse_rankings(root: ET.Element) -> list[LnvRanking]:
    """Parse every ranking entry from an LNV standings document."""
    rankings = []
    for competition in root.findall(".//Competition"):
        for team in competition.findall(".//Equipe"):
            stats = UpdateAssociationStatsInternalRequest(
                played=_integer(team, "MatchsJoues"),
                wins=_integer(team, "MatchsGagnes"),
                losses=_integer(team, "MatchsPerdus"),
                points=_integer(team, "Points"),
                winsThreeToZero=_integer(team, "Resultat_3_0"),
                winsThreeToOne=_integer(team, "Resultat_3_1"),
                winsThreeToTwo=_integer(team, "Resultat_3_2"),
                lossesZeroToThree=_integer(team, "Resultat_0_3"),
                lossesOneToThree=_integer(team, "Resultat_1_3"),
                lossesTwoToThree=_integer(team, "Resultat_2_3"),
                wonSets=_integer(team, "SetPour"),
                lostSets=_integer(team, "SetContre"),
                wonPoints=_integer(team, "PointsPour"),
                lostPoints=_integer(team, "PointsContre"),
                pointsPenalty=0,
                coefSets=_decimal(team, "RatioSet"),
                coefPoints=_decimal(team, "RatioPoints"),
            )
            rankings.append(
                LnvRanking(
                    team_name=(team.get("NomClub") or "").strip(),
                    stats=stats,
                )
            )
    return rankings


def parse_live_matches(html: str) -> tuple[LnvLiveMatch, ...]:
    """Parse every semantic Data Project match block in one document pass."""
    soup = BeautifulSoup(html, "html.parser")
    matches: list[LnvLiveMatch] = []
    for block in soup.find_all(id=lambda value: value and value.endswith("_RPL_Match")):
        if not isinstance(block, Tag):
            continue
        match = _parse_live_match(block)
        if match:
            matches.append(match)
    return tuple(matches)


def _parse_live_match(block: Tag) -> LnvLiveMatch | None:
    """Parse one usable Data Project match block."""
    clickable = block.find("div", onclick=True)
    identifier = (
        re.search(r"mID=(\d+)", clickable.get("onclick", ""))
        if isinstance(clickable, Tag)
        else None
    )
    home = block.find("span", id=re.compile(r"(?:Label2|Label6|LBL_HomeTeamName)$"))
    guest = block.find("span", id=re.compile(r"(?:Label4|Label7|LBL_GuestTeamName)$"))
    date_element = block.find("span", id=re.compile(r"LB_DataOra$"))
    if not (
        identifier
        and isinstance(home, Tag)
        and isinstance(guest, Tag)
        and isinstance(date_element, Tag)
    ):
        return None
    return LnvLiveMatch(
        live_code=int(identifier.group(1)),
        home_name=home.get_text(strip=True),
        guest_name=guest.get_text(strip=True),
        match_date=datetime.strptime(
            date_element.get_text(strip=True), "%d/%m/%Y - %H:%M"
        ).date(),
    )


def _integer(element: ET.Element, name: str) -> int:
    return int(element.findtext(name, default="0"))


def _decimal(element: ET.Element, name: str) -> float:
    return float(element.findtext(name, default="0") or 0)
