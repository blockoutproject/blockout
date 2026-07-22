"""Generated pools-service client adapter."""

from collections.abc import Awaitable

from blockout_contract_clients.pool.api.pool_api import PoolApi
from blockout_contract_clients.pool.api_client import ApiClient
from blockout_contract_clients.pool.configuration import Configuration
from blockout_contract_clients.pool.exceptions import ApiException
from blockout_contract_clients.pool.models.create_pool_internal_request import (
    CreatePoolInternalRequest,
)
from blockout_contract_clients.pool.models.format_enum import FormatEnum
from blockout_contract_clients.pool.models.gender_enum import GenderEnum
from blockout_contract_clients.pool.models.pool_internal_response import (
    PoolInternalResponse,
)
from blockout_contract_clients.pool.models.update_pool_internal_request import (
    UpdatePoolInternalRequest,
)

from scraper.config.settings import POOL_API_URL
from scraper.domain.models import Pool
from scraper.infrastructure.blockout.auth import _get_headers
from scraper.observability.logging import log_event

_POOL_API_PATH = "/api/v1/pools"


def build_pool_api_client() -> ApiClient:
    """Configure the generated HTTPX client from the existing service URL."""
    if not POOL_API_URL or not POOL_API_URL.endswith(_POOL_API_PATH):
        raise ValueError(f"POOL_API_URL must end with '{_POOL_API_PATH}'.")
    return ApiClient(
        Configuration(
            host=POOL_API_URL.removesuffix(_POOL_API_PATH),
            connection_pool_maxsize=20,
            verify_ssl=False,
        )
    )


async def get_pools_by_league_and_season(
    api: PoolApi, league_code: str, season: str
) -> list[Pool]:
    """List Pools for one league and season."""
    responses = await _pool_call(
        api.list_pools(
            league_code=league_code,
            season=season,
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    return [_to_pool(response) for response in responses]


async def create_pool(api: PoolApi, pool: Pool) -> Pool:
    """Create one Pool through the generated client."""
    response = await _pool_call(
        api.create_pool(
            CreatePoolInternalRequest(
                pool_code=pool.pool_code,
                league_code=pool.league_code,
                season=pool.season,
                league_name=pool.league_name,
                raw_name=pool.raw_name,
                name=pool.name,
                short_name=pool.short_name,
                division_id=pool.division_id,
                format=FormatEnum(pool.format),
                gender=GenderEnum(pool.gender),
                followers_count=pool.followers_count,
                active=pool.active,
            ),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    log_event(
        action="create_pool",
        level="info",
        poolCode=pool.pool_code,
        divisionId=pool.division_id,
    )
    return _to_pool(response)


async def update_pool(
    api: PoolApi, pool: Pool, changes_list: list[str] | None = None
) -> Pool:
    """Update one Pool through the generated client."""
    if pool.id is None:
        raise ValueError("A Pool identifier is required for update.")
    response = await _pool_call(
        api.update_pool(
            pool.id,
            UpdatePoolInternalRequest(
                pool_code=pool.pool_code,
                league_code=pool.league_code,
                season=pool.season,
                league_name=pool.league_name,
                raw_name=pool.raw_name,
                name=pool.name,
                short_name=pool.short_name,
                division_id=pool.division_id,
                format=FormatEnum(pool.format),
                gender=GenderEnum(pool.gender),
                active=pool.active,
            ),
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    log_event(
        action="update_pool",
        level="info",
        poolId=pool.id,
        poolCode=pool.pool_code,
        changes_list=changes_list or [],
    )
    return _to_pool(response)


def _to_pool(response: PoolInternalResponse) -> Pool:
    return Pool(
        id=response.id,
        pool_code=response.pool_code,
        league_code=response.league_code,
        season=response.season,
        league_name=response.league_name,
        raw_name=response.raw_name,
        name=response.name,
        short_name=response.short_name,
        division_id=response.division_id,
        format=response.format.value,
        gender=response.gender.value,
        followers_count=response.followers_count,
        active=response.active,
        created_at=response.created_at,
        last_update=response.last_update,
    )


async def _pool_call[T](request: Awaitable[T]) -> T:
    try:
        return await request
    except ApiException as error:
        detail = error.body or error.reason or "Unknown error"
        raise RuntimeError(f"Erreur API {error.status}: {detail}") from error
