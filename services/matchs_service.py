from typing import Optional, Set, List
import aiohttp
from datetime import date, datetime, timezone
from api.matches_api import create_match, deactivate_match, get_active_matches_by_pool_id, get_match_by_league_and_code, get_started_matches, update_match
from models.match import Match, MatchStatus
from config.logger_config import log_event, logger
from models.scraper import Scraper

def find_match_in_cache(scraper: Scraper, pool_id: int, team_id_a: int, team_id_b: int, match_date: date) -> Optional[Match]:
    # On parcourt le cache: key => (league_code, match_code), value => (existing_match, updated_match, changes_list, priority)
    for (league_code, match_code), (original, updated, _, _) in scraper._matches_cache.items():
        # On vérifie si updated (ou original) matche nos critères
        if updated.pool_id == pool_id \
            and updated.team_id_a == team_id_a \
            and updated.team_id_b == team_id_b \
            and updated.match_date and updated.match_date.date() == match_date:
            return updated
    return None

async def deactivate_matches(session: aiohttp.ClientSession, pool_id: int, scraped_match_codes: Set[str]) -> None:
    """
    Désactive les matchs qui existent en base mais n'ont pas été scrapés pour une pool spécifique.
    """
    matches = await get_active_matches_by_pool_id(session, pool_id)
    if not matches:
        return

    matches_to_deactivate = [match for match in matches if match.match_code not in scraped_match_codes]

    if not matches_to_deactivate:
        return

    for match in matches_to_deactivate:
        try:
            await deactivate_match(session, match.id)
        except Exception as e:
            log_event(
                action="deactivate_match",
                level="error",
                match_code=match.match_code,
                match_id=match.id,
                pool_id=pool_id,
                error=str(e)
            )
            
async def log_started_matches() -> None:
    """
    Logue les matchs qui ont commencé.
    """
    current_time = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    async with aiohttp.ClientSession() as session:
        started_matches = await get_started_matches(session, MatchStatus.UPCOMING, True, current_time)

        if started_matches:
            logger.info("Matchs en cours :")
            for match in started_matches:
                logger.info(f"Match {match.match_code} dans la ligue {match.league_code}: "
                            f"équipe A ({match.team_id_a}) vs équipe B ({match.team_id_b}) "
                            f"à {match.match_date} à {match.venue}")
        else:
            logger.info("Aucun match en cours trouvé.")