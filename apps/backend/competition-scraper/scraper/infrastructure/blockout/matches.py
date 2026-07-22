"""Generated matches-service client adapter."""

from collections.abc import Awaitable

from blockout_contract_clients.match.api.match_api import MatchApi
from blockout_contract_clients.match.api_client import ApiClient
from blockout_contract_clients.match.configuration import Configuration
from blockout_contract_clients.match.exceptions import ApiException
from blockout_contract_clients.match.models.bulk_matches_deactivate_internal_request import (
    BulkMatchesDeactivateInternalRequest,
)
from blockout_contract_clients.match.models.create_match_internal_request import (
    CreateMatchInternalRequest,
)
from blockout_contract_clients.match.models.match_internal_response import (
    MatchInternalResponse,
)
from blockout_contract_clients.match.models.update_match_internal_request import (
    UpdateMatchInternalRequest,
)

from scraper.application.models import Match
from scraper.config.settings import MATCH_API_URL
from scraper.infrastructure.blockout.auth import _get_headers
from scraper.observability.logging import log_event

_MATCH_API_PATH = "/api/v1/matches"


def build_match_api_client() -> ApiClient:
    """Configure the generated HTTPX client from the existing service URL."""
    if not MATCH_API_URL or not MATCH_API_URL.endswith(_MATCH_API_PATH):
        raise ValueError(f"MATCH_API_URL must end with '{_MATCH_API_PATH}'.")
    return ApiClient(
        Configuration(
            host=MATCH_API_URL.removesuffix(_MATCH_API_PATH),
            verify_ssl=False,
        )
    )


async def get_matches_by_pool(api: MatchApi, pool_id: int) -> list[Match]:
    """Return every match currently owned by one pool."""
    responses = await _call(
        api.list_matches(
            pool_id=pool_id,
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    return [_to_match(item) for item in responses]


async def create_match(api: MatchApi, match: Match) -> Match:
    """Create one match through the generated owner boundary."""
    response = await _call(
        api.create_match(
            CreateMatchInternalRequest(
                match_code=match.match_code,
                league_code=match.league_code,
                pool_id=match.pool_id,
                live_code=match.live_code,
                team_id_a=match.team_id_a,
                team_id_b=match.team_id_b,
                match_date=match.match_date,
                season=match.season,
                set=match.set,
                score=match.score,
                venue=match.venue,
                first_referee=match.first_referee,
                second_referee=match.second_referee,
                active=match.active,
            ),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    log_event(
        action="create_match",
        level="info",
        match_code=match.match_code,
        pool_id=match.pool_id,
        message="Match created through matches-service.",
    )
    return _to_match(response)


async def update_match(
    api: MatchApi,
    match: Match,
    changes_list: list[str] | None = None,
) -> Match:
    """Update one match through the generated owner boundary."""
    if match.id is None:
        raise ValueError("A match identifier is required for an update.")
    response = await _call(
        api.update_match(
            match.id,
            UpdateMatchInternalRequest(
                match_code=match.match_code,
                league_code=match.league_code,
                pool_id=match.pool_id,
                live_code=match.live_code,
                team_id_a=match.team_id_a,
                team_id_b=match.team_id_b,
                match_date=match.match_date,
                season=match.season,
                set=match.set,
                score=match.score,
                venue=match.venue,
                first_referee=match.first_referee,
                second_referee=match.second_referee,
            ),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    log_event(
        action="update_match",
        level="info",
        match_code=match.match_code,
        changes_list=changes_list or [],
        message="Match updated through matches-service.",
    )
    return _to_match(response)


async def bulk_deactivate_matches(
    api: MatchApi, pool_id: int, missing_match_codes: set[str]
) -> None:
    """Deactivate owner matches absent from one complete provider snapshot."""
    await _call(
        api.bulk_deactivate_matches(
            pool_id,
            BulkMatchesDeactivateInternalRequest(
                missing_match_codes=sorted(missing_match_codes)
            ),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )


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
        created_at=response.created_at,
        last_update=response.last_update,
        live_url=response.live_url,
        live_provider=response.live_provider.value if response.live_provider else None,
        live_owner_auth0_id=response.live_owner_auth0_id,
    )


async def _call[T](request: Awaitable[T]) -> T:
    try:
        return await request
    except ApiException as error:
        detail = error.body or error.reason or "Unknown error"
        raise RuntimeError(f"Erreur API {error.status}: {detail}") from error
