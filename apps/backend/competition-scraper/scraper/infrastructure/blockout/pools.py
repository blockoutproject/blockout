import aiohttp
from dataclasses import asdict, fields

from scraper.config.settings import POOL_API_URL
from scraper.infrastructure.blockout.auth import _get_headers
from scraper.infrastructure.blockout.pool import (
    CreatePoolInternalRequest,
    PoolInternalResponse,
    UpdatePoolInternalRequest,
)
from scraper.infrastructure.blockout.response import handle_api_response
from scraper.observability.logging import log_event

POOL_CREATE_WRITE_FIELDS = tuple(
    field.name for field in fields(CreatePoolInternalRequest)
)
POOL_UPDATE_WRITE_FIELDS = tuple(
    field.name for field in fields(UpdatePoolInternalRequest)
)


def _to_pool_create_payload(pool: PoolInternalResponse) -> dict:
    request = CreatePoolInternalRequest(
        **{field: getattr(pool, field) for field in POOL_CREATE_WRITE_FIELDS}
    )
    return asdict(request)


def _to_pool_update_payload(pool: PoolInternalResponse) -> dict:
    request = UpdatePoolInternalRequest(
        **{field: getattr(pool, field) for field in POOL_UPDATE_WRITE_FIELDS}
    )
    return asdict(request)


@handle_api_response(response_type=list[PoolInternalResponse])
async def get_pools_by_league_and_season(
    session: aiohttp.ClientSession, leagueCode: str, season: str
) -> list[PoolInternalResponse]:
    """
    Récupère toutes les pools pour un code de ligue et une saison spécifiques.
    """
    headers = _get_headers()
    params = {"leagueCode": leagueCode, "season": season}
    url = f"{POOL_API_URL}"
    return await session.get(url, params=params, headers=headers)


@handle_api_response(response_type=PoolInternalResponse)
async def create_pool(
    session: aiohttp.ClientSession, pool: PoolInternalResponse
) -> PoolInternalResponse:
    """
    Envoie une requête POST pour créer une nouvelle pool.
    """
    headers = _get_headers()
    pool_dict = _to_pool_create_payload(pool)
    url = f"{POOL_API_URL}"
    response = await session.post(url, json=pool_dict, headers=headers)
    log_event(
        action="create_pool",
        level="info",
        poolCode=pool.poolCode,
        divisionId=pool.divisionId,
    )
    return response


@handle_api_response(response_type=PoolInternalResponse)
async def update_pool(
    session: aiohttp.ClientSession,
    pool: PoolInternalResponse,
    changes_list: list[str] = [],
) -> PoolInternalResponse:
    """
    Envoie une requête PUT pour mettre à jour une pool existante.
    """
    headers = _get_headers()
    pool_dict = _to_pool_update_payload(pool)
    url = f"{POOL_API_URL}/{pool.id}"
    response = await session.put(url, json=pool_dict, headers=headers)
    log_event(
        action="update_pool",
        level="info",
        poolId=pool.id,
        poolCode=pool.poolCode,
        changes_list=changes_list,
    )
    return response
