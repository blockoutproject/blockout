from blockout_contract_clients.config_service.api.scraper_statuses_api import ScraperStatusesApi
from blockout_contract_clients.config_service.api_client import ApiClient
from blockout_contract_clients.config_service.configuration import Configuration
from blockout_contract_clients.config_service.models.scraper_name_enum import ScraperNameEnum

from api.auth0 import get_token
from api.blockout_client import create_status_client
from config.env_config import CONFIG_API_URL
from models.scraper_status import ScraperStatus


async def get_scraper_status(scraper_name: str) -> ScraperStatus:
    """Read scraper status through a short-lived generated client."""
    async with create_status_client(Configuration, ApiClient, CONFIG_API_URL, get_token) as client:
        response = await client.invoke(
            ScraperStatusesApi(client.api_client).get_scraper_status,
            name=ScraperNameEnum(scraper_name),
        )
    return ScraperStatus(name=response.name.value, enabled=response.enabled)
