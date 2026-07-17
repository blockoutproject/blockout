import aiohttp
from api.blockout_client import ClubBlockoutClients
from models.scraper import Scraper
from scrapers.club_scraper import ClubScraper

class ScraperFactory:
    @staticmethod
    def create_scraper(
        scraper_type: str,
        session: aiohttp.ClientSession,
        blockout_clients: ClubBlockoutClients,
    ) -> Scraper:
        if scraper_type == 'club':
            return ClubScraper(session, blockout_clients)
        else:
            raise ValueError(f"Type de scraper inconnu: {scraper_type}")
