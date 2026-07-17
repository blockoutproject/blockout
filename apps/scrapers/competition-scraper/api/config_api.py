from typing import List, Optional

from blockout_contract_clients.config_service.api.raw_division_mappings_api import RawDivisionMappingsApi
from blockout_contract_clients.config_service.api.scraper_statuses_api import ScraperStatusesApi
from blockout_contract_clients.config_service.api_client import ApiClient
from blockout_contract_clients.config_service.configuration import Configuration
from blockout_contract_clients.config_service.models.create_raw_division_mapping_internal_request import (
    CreateRawDivisionMappingInternalRequest,
)
from blockout_contract_clients.config_service.models.raw_division_mapping_internal_response import (
    RawDivisionMappingInternalResponse,
)
from blockout_contract_clients.config_service.models.scraper_name_enum import ScraperNameEnum

from api.auth0 import get_token
from api.blockout_client import BlockoutClientSession, create_status_client
from config.env_config import CONFIG_API_URL
from config.logger_config import log_event
from models.raw_division_mapping import RawDivisionMapping
from models.scraper_status import ScraperStatus


async def get_raw_division_mappings_by_league_and_season(
    client: BlockoutClientSession,
    league_code: Optional[str],
    season: Optional[str],
) -> List[RawDivisionMapping]:
    """Load raw-division mappings through the generated list operation."""
    response = await client.invoke(
        RawDivisionMappingsApi(client.api_client).list_raw_division_mappings,
        league_code=league_code,
        season=season,
    )
    return [_to_raw_division_mapping(item) for item in response.items]


async def create_raw_division_mapping(
    client: BlockoutClientSession,
    mapping: RawDivisionMapping,
) -> RawDivisionMapping:
    """Create a raw-division mapping through the canonical generated model."""
    command = CreateRawDivisionMappingInternalRequest(
        raw_division_name=mapping.raw_division_name,
        division_id=int(mapping.division_id) if mapping.division_id is not None else None,
        format=mapping.format,
        gender=mapping.gender,
        league_code=mapping.league_code,
        season=mapping.season,
    )
    response = await client.invoke(
        RawDivisionMappingsApi(client.api_client).create_raw_division_mapping,
        create_raw_division_mapping_internal_request=command,
    )
    log_event(
        action="create_raw_division_mapping",
        level="info",
        league_code=mapping.league_code,
        raw_division_name=mapping.raw_division_name,
    )
    return _to_raw_division_mapping(response)


async def get_scraper_status(scraper_name: str) -> ScraperStatus:
    """Read scraper status through a short-lived generated client."""
    async with create_status_client(Configuration, ApiClient, CONFIG_API_URL, get_token) as client:
        response = await client.invoke(
            ScraperStatusesApi(client.api_client).get_scraper_status,
            name=ScraperNameEnum(scraper_name),
        )
    return ScraperStatus(name=response.name.value, enabled=response.enabled)


def _to_raw_division_mapping(response: RawDivisionMappingInternalResponse) -> RawDivisionMapping:
    return RawDivisionMapping(
        id=response.id,
        raw_division_name=response.raw_division_name,
        division_id=str(response.division_id) if response.division_id is not None else None,
        format=response.format.value if response.format is not None else None,
        gender=response.gender.value if response.gender is not None else None,
        league_code=response.league_code,
        season=response.season,
    )
