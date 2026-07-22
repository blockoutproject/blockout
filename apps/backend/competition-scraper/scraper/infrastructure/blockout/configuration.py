"""Generated config-service client adapter."""

from collections.abc import Awaitable

from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.config.api.scraper_status_api import ScraperStatusApi
from blockout_contract_clients.config.api_client import ApiClient
from blockout_contract_clients.config.configuration import Configuration
from blockout_contract_clients.config.exceptions import ApiException
from blockout_contract_clients.config.models.create_raw_division_mapping_internal_request import (
    CreateRawDivisionMappingInternalRequest,
)
from blockout_contract_clients.config.models.format_enum import FormatEnum
from blockout_contract_clients.config.models.gender_enum import GenderEnum
from blockout_contract_clients.config.models.raw_division_mapping_internal_response import (
    RawDivisionMappingInternalResponse,
)
from blockout_contract_clients.config.models.scraper_name_enum import ScraperNameEnum
from blockout_contract_clients.config.models.scraper_status_internal_response import (
    ScraperStatusInternalResponse,
)

from scraper.config.settings import CONFIG_API_URL
from scraper.domain.models import RawDivisionMapping
from scraper.infrastructure.blockout.auth import _get_headers
from scraper.observability.logging import log_event

_CONFIG_API_PATH = "/api/v1/config"


def build_config_api_client() -> ApiClient:
    """Configure the generated HTTPX client from the existing service URL."""
    if not CONFIG_API_URL or not CONFIG_API_URL.endswith(_CONFIG_API_PATH):
        raise ValueError(f"CONFIG_API_URL must end with '{_CONFIG_API_PATH}'.")
    return ApiClient(
        Configuration(
            host=CONFIG_API_URL.removesuffix(_CONFIG_API_PATH),
            connection_pool_maxsize=20,
            verify_ssl=False,
        )
    )


async def get_raw_division_mappings_by_league_and_season(
    api: RawDivisionMappingApi,
    league_code: str | None,
    season: str | None,
) -> list[RawDivisionMapping]:
    """Return mappings for one league and season through the generated client."""
    responses = await _config_call(
        api.list_raw_division_mappings(
            league_code=league_code,
            season=season,
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    return [_to_mapping(response) for response in responses]


async def create_raw_division_mapping(
    api: RawDivisionMappingApi,
    mapping: RawDivisionMapping,
) -> RawDivisionMapping:
    """Create one provider mapping through the generated client."""
    request = CreateRawDivisionMappingInternalRequest(
        raw_division_name=mapping.raw_division_name,
        league_code=mapping.league_code,
        season=mapping.season,
        division_id=mapping.division_id,
        format=FormatEnum(mapping.format) if mapping.format else None,
        gender=GenderEnum(mapping.gender) if mapping.gender else None,
    )
    response = await _config_call(
        api.create_raw_division_mapping(
            request,
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )
    log_event(
        action="create_raw_division_mapping",
        level="info",
        leagueCode=mapping.league_code,
        rawDivisionName=mapping.raw_division_name,
    )
    return _to_mapping(response)


async def get_scraper_status(
    api: ScraperStatusApi,
    scraper_name: ScraperNameEnum,
) -> ScraperStatusInternalResponse:
    """Return one scraper status through the generated client."""
    return await _config_call(
        api.get_scraper_status(
            scraper_name,
            _headers=_get_headers(),
            _request_timeout=10,
        )
    )


def _to_mapping(response: RawDivisionMappingInternalResponse) -> RawDivisionMapping:
    return RawDivisionMapping(
        id=response.id,
        raw_division_name=response.raw_division_name,
        division_id=response.division_id,
        format=response.format.value if response.format else None,
        gender=response.gender.value if response.gender else None,
        league_code=response.league_code,
        season=response.season,
        created_at=response.created_at,
        last_update=response.last_update,
        mapped=response.mapped,
    )


async def _config_call[T](request: Awaitable[T]) -> T:
    try:
        return await request
    except ApiException as error:
        detail = error.body or error.reason or "Unknown error"
        raise RuntimeError(f"Erreur API {error.status}: {detail}") from error
