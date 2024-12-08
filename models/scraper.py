import asyncio
import aiohttp
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from prometheus_client import Gauge
from config.logger_config import log_event, logger
from utils.file_utils import decode_content, detect_encoding
from utils.handlers.error_handler import handle_errors

class Scraper(ABC):
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session        
        # Initialiser un Gauge spécifique à chaque classe de scraper
        self.scraping_duration_gauge = Gauge(
            f"{self.__class__.__name__.lower()}_scraping_duration_seconds",
            f"Durée du scraping pour le scraper {self.__class__.__name__}"
        )
    
    @handle_errors
    async def fetch(self, url: str, retries: int = 3, delay: int = 2) -> str:
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
                logger.warning(f"Erreur lors de la récupération de l'URL '{url}', tentative {attempt + 1}/{retries} : {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                else:
                    raise  # Lever l'exception après toutes les tentatives

    @abstractmethod
    async def run_scraping(self):
        """
        Méthode principale de scraping à implémenter par les sous-classes.
        """
        pass

    async def scrape(self):
        """
        Mesure le temps d'exécution de la méthode de scraping et enregistre les logs.
        Enregistre également une métrique Prometheus pour la durée.
        Appelle `run_scraping` implémentée par les sous-classes.
        """
        start_time = datetime.now(timezone.utc)  # Début de la mesure
        class_name = self.__class__.__name__

        log_event(
            action="start_scraping",
            level="info",
            scraper=class_name,
            message=f"Début du scraping pour {class_name}."
        )

        try:
            await self.run_scraping()
        except Exception as e:
            log_event(
                action="scraping_error",
                level="error",
                scraper=class_name,
                error=str(e),
                message=f"Erreur lors du scraping pour {class_name}."
            )
            raise
        finally:
            end_time = datetime.now(timezone.utc)  # Fin de la mesure
            duration = (end_time - start_time).total_seconds()

            # Enregistrement dans le Gauge Prometheus
            self.scraping_duration_gauge.set(duration)

            log_event(
                action="end_scraping",
                level="info",
                scraper=class_name,
                duration=duration,
                message=f"Scraping terminé pour {class_name} en {duration:.2f} secondes."
            )