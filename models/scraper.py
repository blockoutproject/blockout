from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
import aiohttp
from prometheus_client import Gauge
from config.logger_config import log_event
from utils.handlers.error_handler import handle_errors
from config.logger_config import current_scraper

class Scraper(ABC):
    # Stocker un Gauge unique par classe de scraper
    _gauges = {}

    def __init__(self, session: aiohttp.ClientSession, name: str):
        self.session = session
        self.name = name

        # Récupérer ou créer le Gauge pour la classe en cours
        class_name = self.__class__.__name__.lower()
        if class_name not in Scraper._gauges:
            Scraper._gauges[class_name] = Gauge(
                f"{class_name}_scraping_duration_seconds",
                f"Durée du scraping pour le scraper {class_name}"
            )
        self.scraping_duration_gauge = Scraper._gauges[class_name]
        
    @handle_errors
    async def fetch(self, url: str, retries: int = 3, delay: int = 2, sem: int = 10, timeout: int = 10) -> str:
        """
        Récupère le contenu d'une URL avec gestion des retries, timeout global et semaphore.
        """

        async with asyncio.Semaphore(sem):  # Limiter les connexions simultanées
            for attempt in range(1, retries + 1):
                try:
                    async with self.session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
                        response.raise_for_status()
                        raw_content = await response.content.read()
                        
                        if url.startswith("http://www.ffvb.org/") or url.startswith("http://www.ffvbbeach.org/"):
                            decoded_content = raw_content.decode("windows-1252", errors="replace")
                        else:
                            decoded_content = raw_content.decode("utf-8", errors="replace")
                            
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
                        url=url,
                        attempt=attempt,
                        status=e.status,
                        error=str(e),
                        message=f"Erreur HTTP {e.status} lors de la récupération de l'URL '{url}' (tentative {attempt}/{retries})."
                    )

                except asyncio.TimeoutError as e:
                    log_event(
                        action="http_request_timeout",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Timeout lors de la récupération de l'URL '{url}' (tentative {attempt}/{retries})."
                    )
                except Exception as e:
                    log_event(
                        action="http_request_unexpected_error",
                        level="error",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Erreur inattendue lors de la récupération de l'URL '{url}' (tentative {attempt}/{retries})."
                    )

                # Gestion des retries
                if attempt < retries:
                    log_event(
                        action="http_request_retry",
                        level="warning",
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
        current_scraper.set(self.name)

        start_time = datetime.now(timezone.utc)

        try:
            await self.run_scraping()
        except Exception as e:
            log_event(
                action="scraping_error",
                level="error",
                error=str(e),
            )
            raise
        finally:
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()

            # Enregistrement dans le Gauge Prometheus
            self.scraping_duration_gauge.set(duration)

            log_event(
                action="end_scraping",
                level="info",
                duration=duration,
            )