import aiohttp
from models.scraper import Scraper
from scrapers.club_scraper import ClubScraper

class ScraperFactory:
    @staticmethod
    def create_scraper(scraper_type: str, session: aiohttp.ClientSession) -> Scraper:
        if scraper_type == 'club':
            return ClubScraper(session)
        else:
            raise ValueError(f"Type de scraper inconnu: {scraper_type}")