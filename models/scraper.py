from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
import aiohttp
from prometheus_client import Gauge
from config.logger_config import log_event
from utils.file_utils import decode_content, detect_encoding
from utils.handlers.error_handler import handle_errors

class Scraper(ABC):
    # Stocker un Gauge unique par classe de scraper
    _gauges = {}

    def __init__(self, session: aiohttp.ClientSession):
        self.session = session

        # Récupérer ou créer le Gauge pour la classe en cours
        class_name = self.__class__.__name__.lower()
        if class_name not in Scraper._gauges:
            Scraper._gauges[class_name] = Gauge(
                f"{class_name}_scraping_duration_seconds",
                f"Durée du scraping pour le scraper {class_name}"
            )
        self.scraping_duration_gauge = Scraper._gauges[class_name]
        
    @handle_errors
    async def fetch(self, url: str, retries: int = 3, delay: int = 2, sem: int = 10, timeout: int = 5) -> str:
        """
        Récupère le contenu d'une URL avec gestion des retries, timeout global et semaphore.
        """
        class_name = self.__class__.__name__.lower()

        async with asyncio.Semaphore(sem):  # Limiter les connexions simultanées
            for attempt in range(1, retries + 1):
                try:
                    async with self.session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
                        response.raise_for_status()
                        raw_content = await response.content.read()
                        detected_encoding = detect_encoding(raw_content)
                        decoded_content = decode_content(raw_content, detected_encoding)

                        if attempt > 1:
                            log_event(
                                action="http_request_retry_success",
                                level="info",
                                attempt=attempt,
                                url=url,
                                message=f"Succès après retry {attempt}/{retries}: Contenu récuperé pour l'URL {url}."
                            )
                        return decoded_content

                except aiohttp.ClientError as e:
                    log_event(
                        action="http_request_error",
                        level="warning",
                        scraper=class_name,
                        url=url,
                        attempt=attempt,
                        status=e.status,
                        error=str(e),
                        message=f"Erreur HTTP {e.status} lors de la récupération de l'URL '{url}' (tentative {attempt + 1}/{retries})."
                    )

                except asyncio.TimeoutError as e:
                    log_event(
                        action="http_request_timeout",
                        level="warning",
                        scraper=class_name,
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Timeout lors de la récupération de l'URL '{url}' (tentative {attempt + 1}/{retries})."
                    )
                except Exception as e:
                    log_event(
                        action="http_request_unexpected_error",
                        level="error",
                        scraper=class_name,
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Erreur inattendue lors de la récupération de l'URL '{url}' (tentative {attempt + 1}/{retries})."
                    )

                # Gestion des retries
                if attempt < retries:
                    log_event(
                        action="http_request_retry",
                        level="warning",
                        scraper=class_name,
                        url=url,
                        attempt=attempt,
                        delay=delay,
                        message=f"Nouvelle tentative pour l'URL '{url}' après un délai de {delay} secondes."
                    )
                    await asyncio.sleep(delay)
                else:
                    log_event(
                        action="http_request_failed",
                        level="error",
                        scraper=class_name,
                        url=url,
                        attempt=retries,
                        message=f"Échec complet après {retries} tentatives pour l'URL '{url}'."
                    )
                    raise Exception(f"Échec complet pour l'URL '{url}' après {retries} tentatives.")

        
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
        start_time = datetime.now(timezone.utc)
        class_name = self.__class__.__name__

        log_event(
            action="start_scraping",
            level="debug",
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