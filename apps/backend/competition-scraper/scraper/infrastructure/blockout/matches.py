import aiohttp

from scraper.config.settings import MATCH_API_URL
from scraper.domain.normalization import to_dict
from scraper.infrastructure.blockout.auth import _get_headers
from scraper.infrastructure.blockout.match import (
    BulkMatchesDeactivateInternalRequest,
    CreateMatchInternalRequest,
    MatchInternalResponse,
    UpdateMatchInternalRequest,
)
from scraper.infrastructure.blockout.response import handle_api_response
from scraper.observability.logging import log_event


def _to_match_create_payload(match: MatchInternalResponse) -> dict:
    request = CreateMatchInternalRequest(
        **{
            field: getattr(match, field)
            for field in CreateMatchInternalRequest.__dataclass_fields__
        }
    )
    return to_dict(request)


def _to_match_update_payload(match: MatchInternalResponse) -> dict:
    request = UpdateMatchInternalRequest(
        **{
            field: getattr(match, field)
            for field in UpdateMatchInternalRequest.__dataclass_fields__
        }
    )
    return to_dict(request)


@handle_api_response(response_type=list[MatchInternalResponse])
async def get_matches_by_pool(
    session: aiohttp.ClientSession, poolId: int
) -> list[MatchInternalResponse] | None:
    """
    Récupère tous les matchs d'une poule (filtre poolId).
    """
    headers = _get_headers()
    params = {"poolId": poolId}
    url = f"{MATCH_API_URL}"
    response = await session.get(url, params=params, headers=headers)
    return response


@handle_api_response(response_type=MatchInternalResponse)
async def create_match(
    session: aiohttp.ClientSession, match: MatchInternalResponse
) -> MatchInternalResponse:
    """
    Crée un nouveau match avec les informations fournies.
    """
    headers = _get_headers()
    match_dict = _to_match_create_payload(match)
    url = f"{MATCH_API_URL}"
    response = await session.post(url, json=match_dict, headers=headers)
    log_event(
        action="create_match",
        level="info",
        matchCode=match.matchCode,
        poolId=match.poolId,
        message=f"POST {url} - Création du match.",
    )
    return response


@handle_api_response(response_type=MatchInternalResponse)
async def update_match(
    session: aiohttp.ClientSession,
    match: MatchInternalResponse,
    changes_list: list[str] = [],
) -> MatchInternalResponse:
    """
    Met à jour un match existant.
    """
    headers = _get_headers()
    match_dict = _to_match_update_payload(match)
    url = f"{MATCH_API_URL}/{match.id}"
    response = await session.put(url, json=match_dict, headers=headers)
    log_event(
        action="update_match",
        level="info",
        matchCode=match.matchCode,
        changes_list=changes_list,
        message="Mise à jour du match.",
    )
    return response


@handle_api_response(response_type=None)
async def bulk_deactivate_matches(
    session: aiohttp.ClientSession, poolId: int, missing_match_codes: set[str]
) -> None:
    """
    Désactive en masse les matchs correspondant aux codes fournis.
    """
    headers = _get_headers()
    url = f"{MATCH_API_URL}/pools/{poolId}/bulk-deactivate"
    payload = to_dict(
        BulkMatchesDeactivateInternalRequest(
            missingMatchCodes=list(missing_match_codes)
        )
    )
    response = await session.put(url, json=payload, headers=headers)
    return response
