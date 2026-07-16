from typing import Optional
from datetime import date
from models.match import Match
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