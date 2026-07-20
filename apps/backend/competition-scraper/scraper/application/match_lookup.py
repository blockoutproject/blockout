from datetime import date

from scraper.application.source import Scraper
from scraper.infrastructure.blockout.match import MatchInternalResponse


def find_match_in_cache(
    scraper: Scraper, poolId: int, teamIdA: int, teamIdB: int, matchDate: date
) -> MatchInternalResponse | None:
    # On parcourt le cache: key => (leagueCode, matchCode), value => (existing_match, updated_match, changes_list, priority)
    for (leagueCode, matchCode), (
        original,
        updated,
        _,
        _,
    ) in scraper._matches_cache.items():
        # On vérifie si updated (ou original) matche nos critères
        if (
            updated.poolId == poolId
            and updated.teamIdA == teamIdA
            and updated.teamIdB == teamIdB
            and updated.matchDate
            and updated.matchDate.date() == matchDate
        ):
            return updated
    return None
