import asyncio
import aiohttp
from abc import ABC, abstractmethod
from config.logger_config import logger
from utils.file_utils import decode_content, detect_encoding
from utils.handlers.error_handler import handle_errors

class Scraper(ABC):
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session        
    
    @handle_errors
    async def fetch(self, url: str, retries: int = 3, delay: int = 5) -> str:
        """
        Récupère le contenu d'une URL avec gestion des retries en cas d'échec.
        """
        for attempt in range(retries):
            try:
                async with self.session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    response.raise_for_status()
                    raw_content = await response.content.read()
                    detected_encoding = detect_encoding(raw_content)
                    decoded_content = decode_content(raw_content, detected_encoding)
                    if attempt > 1:
                        logger.info(f"Succès après retry {attempt}/{retries} pour l'URL '{url}'")
                    return decoded_content
            except Exception as e:
                logger.error(f"Erreur lors de la récupération de l'URL '{url}', tentative {attempt + 1}/{retries} : {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay)  # Attendre avant de réessayer
                else:
                    raise  # Lever l'exception après toutes les tentatives

    @abstractmethod
    @handle_errors
    async def scrape(self):
        """Méthode principale de scraping à implémenter par les sous-classes."""
        pass