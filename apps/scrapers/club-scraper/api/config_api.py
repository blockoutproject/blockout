import aiohttp
from config.env_config import CONFIG_API_URL
from models.scraper_status import ScraperStatus
from utils.handlers.api_handler import handle_api_response
from api.auth0 import _get_headers


@handle_api_response(response_type=ScraperStatus)
async def get_scraper_status(
    session: aiohttp.ClientSession,
    scraper_name: str
) -> ScraperStatus:
    """
    Récupère le statut (activé/désactivé) d'un scraper par son nom.
    Lève une exception si le scraper n'existe pas.
    """
    headers = _get_headers()
    url = f"{CONFIG_API_URL}/scrapers/{scraper_name}/status"
    return await session.get(url, headers=headers)