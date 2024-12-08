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

    def __init__(self, session):
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
async def fetch(self, url: str, retries: int = 3, delay: int = 2) -> str:
    """
    Récupère le contenu d'une URL avec gestion des retries et enregistre des événements de log.
    """
    class_name = self.__class__.__name__.lower()

    for attempt in range(retries):
        try:
            async with self.session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=15)) as response:
                # Enregistrement d'un log de début
                log_event(
                    action="http_request",
                    level="debug",
                    scraper=class_name,
                    url=url,
                    attempt=attempt + 1,
                    status=response.status,
                    message=f"Récupération du contenu de l'URL '{url}', tentative {attempt + 1}/{retries}."
                )

                # Vérification du statut HTTP
                response.raise_for_status()

                # Décodage du contenu
                raw_content = await response.content.read()
                detected_encoding = detect_encoding(raw_content)
                decoded_content = decode_content(raw_content, detected_encoding)

                log_event(
                    action="http_request_success",
                    level="debug",
                    scraper=class_name,
                    url=url,
                    status=response.status,
                    encoding=detected_encoding,
                    message=f"Contenu récupéré avec succès pour '{url}' après {attempt + 1} tentative(s)."
                )
                return decoded_content

        except aiohttp.ClientResponseError as e:
            log_event(
                action="http_request_error",
                level="warning",
                scraper=class_name,
                url=url,
                attempt=attempt + 1,
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
                attempt=attempt + 1,
                error=str(e),
                message=f"Timeout lors de la récupération de l'URL '{url}' (tentative {attempt + 1}/{retries})."
            )

        except Exception as e:
            log_event(
                action="http_request_failure",
                level="error",
                scraper=class_name,
                url=url,
                attempt=attempt + 1,
                error=str(e),
                message=f"Erreur inattendue lors de la récupération de l'URL '{url}' (tentative {attempt + 1}/{retries})."
            )

        # Gestion des retries
        if attempt < retries - 1:
            log_event(
                action="http_request_retry",
                level="debug",
                scraper=class_name,
                url=url,
                attempt=attempt + 1,
                delay=delay,
                message=f"Nouvelle tentative pour l'URL '{url}' après un délai de {delay} secondes."
            )
            await asyncio.sleep(delay)
        else:
            log_event(
                action="http_request_exhausted",
                level="error",
                scraper=class_name,
                url=url,
                attempt=attempt + 1,
                retries=retries,
                message=f"Échec complet après {retries} tentatives pour l'URL '{url}'."
            )
            raise 

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