import aiohttp
import httpx

from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.departmental import DepartmentalScraper
from scraper.infrastructure.ffvb.national import NationalScraper
from scraper.infrastructure.ffvb.regional import RegionalScraper
from scraper.infrastructure.lnv.professional import ProScraper


class ScraperFactory:
    @staticmethod
    def create_scraper(
        scraper_type: str,
        session: aiohttp.ClientSession,
        provider_client: httpx.AsyncClient,
    ) -> Scraper:
        if scraper_type == "pro":
            return ProScraper(session, provider_client)
        elif scraper_type == "national":
            return NationalScraper(session, provider_client)
        elif scraper_type == "regional":
            return RegionalScraper(session, provider_client)
        elif scraper_type == "departmental":
            return DepartmentalScraper(session, provider_client)
        else:
            raise ValueError(f"Type de scraper inconnu: {scraper_type}")
