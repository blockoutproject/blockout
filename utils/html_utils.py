import asyncio
import aiohttp
from bs4 import BeautifulSoup
from models.association_stats import AssociationStats
from models.pool import Pool
from models.scraper import Scraper

sem = asyncio.Semaphore(5)

def parse_int(text: str) -> int:
    try:
        return int(text.strip()) if text else 0
    except ValueError:
        return 0

def parse_float(text: str) -> float:
    try:
        return float(text.strip().replace(",", ".")) if text else 0.0
    except ValueError:
        return 0.0

def parse_stat_line(cols: list[str]) -> AssociationStats:
    return AssociationStats(
        points=parse_int(cols[2].text),
        played=parse_int(cols[3].text),
        wins=parse_int(cols[4].text),
        losses=parse_int(cols[5].text),
        wins_three_to_zero=parse_int(cols[7].text),
        wins_three_to_one=parse_int(cols[8].text),
        wins_three_to_two=parse_int(cols[9].text),
        losses_two_to_three=parse_int(cols[10].text),
        losses_one_to_three=parse_int(cols[11].text),
        losses_zero_to_three=parse_int(cols[12].text),
        won_sets=parse_int(cols[13].text),
        lost_sets=parse_int(cols[14].text),
        coef_sets=parse_float(cols[15].text),
        won_points=parse_int(cols[16].text),
        lost_points=parse_int(cols[17].text),
        coef_points=parse_float(cols[18].text),
        points_penalty=0
    )

async def extract_club_stats_list(scraper: Scraper, raw_season: str, pool: Pool) -> list[tuple[str, AssociationStats]]:
    url = f"http://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison={raw_season}&codent={pool.league_code}&poule={pool.pool_code}"

    html = await scraper.fetch(url)
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table", attrs={"cellspacing": "1", "cellpadding": "2", "border": "0"})

    if not tables:
        raise ValueError("Tableau de stats non trouvé.")

    target_table = tables[0]
    rows = target_table.find_all("tr")[1:]  # skip header

    clubs_stats = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 19:
            continue

        try:
            name = cols[1].get_text(strip=True)
            stats = parse_stat_line(cols)
            if not name or not stats:
                continue
            clubs_stats.append((name, stats))
        except Exception as e:
            print(f"Erreur parsing ligne : {e}")
            continue

    return clubs_stats