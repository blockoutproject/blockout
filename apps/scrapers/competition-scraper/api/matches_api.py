from typing import List, Set

from blockout_contract_clients.matches_service.api.matches_api import MatchesApi
from blockout_contract_clients.matches_service.models.create_match_internal_request import CreateMatchInternalRequest
from blockout_contract_clients.matches_service.models.match_internal_response import MatchInternalResponse
from blockout_contract_clients.matches_service.models.missing_match_codes_internal_request import (
    MissingMatchCodesInternalRequest,
)
from blockout_contract_clients.matches_service.models.update_match_internal_request import UpdateMatchInternalRequest

from api.blockout_client import BlockoutClientSession
from config.logger_config import log_event
from models.match import Match


PAGE_SIZE = 100


async def get_matches_by_pool(client: BlockoutClientSession, pool_id: int) -> List[Match]:
    """Load every canonical match page into scraper-owned models."""
    api = MatchesApi(client.api_client)
    matches: List[Match] = []
    page = 0
    while True:
        response = await client.invoke(
            api.list_matches,
            pool_id=pool_id,
            page=page,
            page_size=PAGE_SIZE,
        )
        matches.extend(_to_match(item) for item in response.items)
        if not response.page_info.has_next:
            return matches
        page += 1


async def create_match(client: BlockoutClientSession, match: Match) -> Match:
    """Create a match through the canonical generated model."""
    response = await client.invoke(
        MatchesApi(client.api_client).create_match,
        create_match_internal_request=CreateMatchInternalRequest(**_match_fields(match)),
    )
    log_event(
        action="create_match",
        level="info",
        match_code=match.match_code,
        pool_id=match.pool_id,
        message="Création du match via le client généré.",
    )
    return _to_match(response)


async def update_match(
    client: BlockoutClientSession,
    match: Match,
    changes_list: List[str] | None = None,
) -> Match:
    """Update a match through the canonical generated model."""
    if match.id is None:
        raise ValueError("A match ID is required for update.")
    response = await client.invoke(
        MatchesApi(client.api_client).update_match,
        id=match.id,
        update_match_internal_request=UpdateMatchInternalRequest(**_match_fields(match)),
    )
    log_event(
        action="update_match",
        level="info",
        match_code=match.match_code,
        changes_list=changes_list or [],
        message="Mise à jour du match via le client généré.",
    )
    return _to_match(response)


async def bulk_deactivate_matches(
    client: BlockoutClientSession,
    pool_id: int,
    missing_match_codes: Set[str],
) -> None:
    """Deactivate missing pool matches through the canonical command."""
    command = MissingMatchCodesInternalRequest(missing_match_codes=sorted(missing_match_codes))
    await client.invoke(
        MatchesApi(client.api_client).bulk_deactivate_matches_by_pool,
        pool_id=pool_id,
        missing_match_codes_internal_request=command,
    )


def _match_fields(match: Match) -> dict[str, object]:
    return {
        "match_code": match.match_code,
        "league_code": match.league_code,
        "pool_id": match.pool_id,
        "live_code": match.live_code,
        "team_id_a": match.team_id_a,
        "team_id_b": match.team_id_b,
        "match_date": match.match_date,
        "season": match.season,
        "set": match.set,
        "score": match.score,
        "venue": match.venue,
        "first_referee": match.first_referee,
        "second_referee": match.second_referee,
    }


def _to_match(response: MatchInternalResponse) -> Match:
    return Match(
        id=response.id,
        match_code=response.match_code,
        league_code=response.league_code,
        pool_id=response.pool_id,
        live_code=response.live_code,
        team_id_a=response.team_id_a,
        team_id_b=response.team_id_b,
        match_date=response.match_date,
        season=response.season,
        set=response.set,
        score=response.score,
        status=response.status.value,
        venue=response.venue,
        first_referee=response.first_referee,
        second_referee=response.second_referee,
        active=response.active,
    )
