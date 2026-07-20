import asyncio

from bs4 import BeautifulSoup

from scraper.application.source import Scraper
from scraper.infrastructure.blockout.association_stats import (
    UpdateAssociationStatsInternalRequest,
)
from scraper.infrastructure.blockout.pool import PoolInternalResponse
from scraper.observability.logging import log_event

sem = asyncio.Semaphore(5)


def parse_int(text: str) -> int:
    try:
        return int(text.strip()) if text else 0
    except ValueError:
        return 0


def parse_float(text: str) -> float:
    if not text:
        return 0.0

    text = text.strip()
    if text == "MAX":
        return 1000.0

    try:
        return float(text.replace(",", "."))
    except ValueError:
        return 0.0


def parse_stat_line(cols: list[str]) -> UpdateAssociationStatsInternalRequest:
    return UpdateAssociationStatsInternalRequest(
        points=parse_int(cols[2].text),
        played=parse_int(cols[3].text),
        wins=parse_int(cols[4].text),
        losses=parse_int(cols[5].text),
        winsThreeToZero=parse_int(cols[7].text),
        winsThreeToOne=parse_int(cols[8].text),
        winsThreeToTwo=parse_int(cols[9].text),
        lossesTwoToThree=parse_int(cols[10].text),
        lossesOneToThree=parse_int(cols[11].text),
        lossesZeroToThree=parse_int(cols[12].text),
        wonSets=parse_int(cols[13].text),
        lostSets=parse_int(cols[14].text),
        coefSets=parse_float(cols[15].text),
        wonPoints=parse_int(cols[16].text),
        lostPoints=parse_int(cols[17].text),
        coefPoints=parse_float(cols[18].text),
        pointsPenalty=0,
    )


async def extract_club_stats_list(
    scraper: Scraper, raw_season: str, pool: PoolInternalResponse
) -> list[tuple[str, UpdateAssociationStatsInternalRequest]]:
    url = f"http://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison={raw_season}&codent={pool.leagueCode}&poule={pool.poolCode}"

    html = await scraper.fetch(url)
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all(
        "table", attrs={"cellspacing": "1", "cellpadding": "2", "border": "0"}
    )

    if not tables:
        raise ValueError("Tableau de stats non trouvé.")

    target_table = tables[0]
    rows = target_table.find_all("tr")[1:]  # skip header

    teams_stats = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 19:
            continue

        try:
            name = cols[1].get_text(strip=True)
            stats = parse_stat_line(cols)

            if not name or not stats:
                continue
            teams_stats.append((name, stats))
        except Exception as e:
            log_event(
                action="extract_club_stats_list",
                level="error",
                message=f"Erreur lors de l'extraction des stats pour la ligne: {row}",
                error=str(e),
            )
            continue

    return teams_stats
