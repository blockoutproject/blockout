from typing import List

from blockout_contract_clients.pools_service.api.pools_api import PoolsApi
from blockout_contract_clients.pools_service.models.create_pool_internal_request import CreatePoolInternalRequest
from blockout_contract_clients.pools_service.models.pool_internal_response import PoolInternalResponse
from blockout_contract_clients.pools_service.models.update_pool_internal_request import UpdatePoolInternalRequest

from api.blockout_client import BlockoutClientSession
from config.logger_config import log_event
from models.pool import Pool


PAGE_SIZE = 100


async def get_pools_by_league_and_season(
    client: BlockoutClientSession,
    league_code: str,
    season: str,
) -> List[Pool]:
    """Load every canonical pool page into scraper-owned models."""
    api = PoolsApi(client.api_client)
    pools: List[Pool] = []
    page = 0
    while True:
        response = await client.invoke(
            api.list_pools,
            league_code=league_code,
            season=season,
            page=page,
            page_size=PAGE_SIZE,
        )
        pools.extend(_to_pool(item) for item in response.items)
        if not response.page_info.has_next:
            return pools
        page += 1


async def create_pool(client: BlockoutClientSession, pool: Pool) -> Pool:
    """Create a pool through the canonical generated model."""
    response = await client.invoke(
        PoolsApi(client.api_client).create_pool,
        create_pool_internal_request=CreatePoolInternalRequest(**_pool_fields(pool)),
    )
    log_event(
        action="create_pool",
        level="info",
        pool_code=pool.pool_code,
        division_id=pool.division_id,
    )
    return _to_pool(response)


async def update_pool(
    client: BlockoutClientSession,
    pool: Pool,
    changes_list: List[str] | None = None,
) -> Pool:
    """Update a pool through the canonical generated model."""
    if pool.id is None:
        raise ValueError("A pool ID is required for update.")
    response = await client.invoke(
        PoolsApi(client.api_client).update_pool,
        id=pool.id,
        update_pool_internal_request=UpdatePoolInternalRequest(
            **_pool_fields(pool),
            active=pool.active,
        ),
    )
    log_event(
        action="update_pool",
        level="info",
        pool_id=pool.id,
        pool_code=pool.pool_code,
        changes_list=changes_list or [],
    )
    return _to_pool(response)


def _pool_fields(pool: Pool) -> dict[str, object]:
    return {
        "pool_code": pool.pool_code,
        "league_code": pool.league_code,
        "season": pool.season,
        "league_name": pool.league_name,
        "raw_name": pool.raw_name,
        "name": pool.name,
        "short_name": pool.short_name,
        "division_id": int(pool.division_id),
        "format": pool.format,
        "gender": pool.gender,
    }


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
        division_id=str(response.division_id),
        format=response.format.value,
        gender=response.gender.value,
        followers_count=response.followers_count,
        active=response.active,
    )
