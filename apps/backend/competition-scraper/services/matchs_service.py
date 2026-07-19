from typing import Optional
from datetime import date
from models.match import Match
from models.scraper import Scraper

def find_match_in_cache(scraper: Scraper, poolId: int, teamIdA: int, teamIdB: int, matchDate: date) -> Optional[Match]:
    # On parcourt le cache: key => (leagueCode, matchCode), value => (existing_match, updated_match, changes_list, priority)
    for (leagueCode, matchCode), (original, updated, _, _) in scraper._matches_cache.items():
        # On vérifie si updated (ou original) matche nos critères
        if updated.poolId == poolId \
            and updated.teamIdA == teamIdA \
            and updated.teamIdB == teamIdB \
            and updated.matchDate and updated.matchDate.date() == matchDate:
            return updated
    return None