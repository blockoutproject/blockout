from typing import Optional, Set, List
import aiohttp
from datetime import date, datetime, timezone
from api.matches_api import create_match, deactivate_match, get_active_matches_by_pool_id, get_match_by_league_and_code, get_started_matches, update_match
from models.match import Match, MatchStatus
from config.logger_config import log_event, logger
from models.scraper import Scraper

async def add_or_update_match(session: aiohttp.ClientSession, match: Match, existing_match: Optional[Match]) -> Match:
    """
    Vérifie l'existence d'un match et le met à jour ou le crée selon les besoins.
    """
    # Vérification des champs requis
    required_fields = ['league_code', 'match_code', 'pool_id', 'team_id_a', 'team_id_b', 'match_date']
    missing_fields = [field for field in required_fields if not getattr(match, field, None)]
    if missing_fields:
        raise ValueError(f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}.")
    
    if existing_match:
        changes_list = []
        match.id = existing_match.id

        for field in ['team_id_a', 'team_id_b', 'match_date', 'set', 'score', 'status', 'venue', 'referee1', 'referee2']:
            if field == 'match_date' and match.league_code != 'AALNV':
                if existing_match.match_date.isoformat() != match.match_date.isoformat():
                    changes_list.append(f"{field}: {existing_match.match_date.isoformat()} -> {match.match_date.isoformat()}")
            elif field != 'match_date' and getattr(existing_match, field, None) != getattr(match, field, None):
                changes_list.append(f"{field}: {getattr(existing_match, field)} -> {getattr(match, field)}")

        if not existing_match.active:
            match.active = True
            changes_list.append("Match réactivé.")

        if changes_list:
            return await update_match(session, match, changes_list)
        return existing_match

    # Cas où le match n'existe pas
    new_match = await create_match(session, match)
    return new_match

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