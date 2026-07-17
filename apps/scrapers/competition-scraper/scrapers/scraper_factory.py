import aiohttp
from api.blockout_client import CompetitionBlockoutClients
from models.scraper import Scraper
from scrapers.departmental_scraper import DepartmentalScraper
from scrapers.national_scraper import NationalScraper
from scrapers.pro_scraper import ProScraper
from scrapers.regional_scraper import RegionalScraper

class ScraperFactory:
    @staticmethod
    def create_scraper(
        scraper_type: str,
        session: aiohttp.ClientSession,
        blockout_clients: CompetitionBlockoutClients,
    ) -> Scraper:
        if scraper_type == 'pro':
            return ProScraper(session, blockout_clients)
        elif scraper_type == 'national':
            return NationalScraper(session, blockout_clients)
        elif scraper_type == 'regional':
            return RegionalScraper(session, blockout_clients)
        elif scraper_type == 'departmental':
            return DepartmentalScraper(session, blockout_clients)
        else:
            raise ValueError(f"Type de scraper inconnu: {scraper_type}")
