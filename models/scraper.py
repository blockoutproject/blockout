from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
from typing import Optional
import aiohttp
from prometheus_client import Gauge
from api.clubs_api import get_all_clubs
from api.teams_api import get_unique_club_ids
from config.logger_config import log_event, current_scraper
from dataclasses import replace

from models.club import Club

class Scraper(ABC):
    _gauges = {}

    def __init__(
        self, 
        session: aiohttp.ClientSession, 
        name: str, 
        url: str = None, 
    ):
        self.session = session
        self.name = name
        self.url = url
        
        # Cache local : dict[(club_id), (existing_club, updated_club, changes_list)]
        self._clubs_cache: dict[
            str,
            tuple[Optional[Club], Club]
        ] = {}
        self.scraped_club_ids = set()

        # Prometheus gauge
        class_name = self.__class__.__name__.lower()
        if class_name not in Scraper._gauges:
            Scraper._gauges[class_name] = Gauge(
                f"{class_name}_scraping_duration_seconds",
                f"Durée du scraping pour le scraper {class_name}"
            )
        self.scraping_duration_gauge = Scraper._gauges[class_name]

    @abstractmethod
    async def run_scraping(self):
        pass

    async def scrape(self):
        current_scraper.set(self.name)
        start_time = datetime.now(timezone.utc)
        
        try:
            await self.init_clubs_cache()
            club_ids = await get_unique_club_ids(self.session)
            await self.run_scraping(club_ids)
        except Exception as e:
            log_event(
                action="scraping_error",
                level="error",
                error=str(e),
                message=f"Erreur dans le scraper {self.name}"
            )
            raise
        finally:
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()
            self.scraping_duration_gauge.set(duration)
            
    async def fetch(self, url: str, retries: int = 3, delay: int = 2, sem: int = 5, timeout: int = 20) -> str:
        """
        Récupère le contenu d'une URL avec gestion des retries, timeout global et semaphore.
        """

        async with asyncio.Semaphore(sem):  # Limiter les connexions simultanées
            for attempt in range(1, retries + 1):
                try:
                    # Tentative de récupération
                    async with self.session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
                        response.raise_for_status()
                        raw_content = await response.content.read()
                        
                        # Détection de l'encodage
                        if url.startswith("http://www.ffvb.org/") or url.startswith("http://www.ffvbbeach.org/"):
                            decoded_content = raw_content.decode("windows-1252", errors="replace")
                        else:
                            decoded_content = raw_content.decode("utf-8", errors="replace")

                        # Log en cas de succès après un retry
                        if attempt > 1:
                            log_event(
                                action="http_request_retry_success",
                                level="info",
                                attempt=attempt,
                                url=url,
                                message=f"Succès après retry {attempt}/{retries}: Contenu récupéré pour l'URL {url}."
                            )
                        return decoded_content

                except aiohttp.ClientConnectorDNSError as e:
                    # Problème spécifique à la résolution DNS
                    log_event(
                        action="http_request_dns_error",
                        level="error",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Erreur DNS lors de la récupération de l'URL '{url}' (tentative {attempt}/{retries})."
                    )

                except aiohttp.ClientConnectorError as e:
                    # Problème de connexion générale (autre que DNS)
                    log_event(
                        action="http_request_connector_error",
                        level="error",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Erreur de connexion réseau lors de la récupération de l'URL '{url}' (tentative {attempt}/{retries})."
                    )

                except aiohttp.ClientResponseError as e:
                    # Erreurs HTTP spécifiques (codes 4xx, 5xx)
                    log_event(
                        action="http_request_http_error",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        status=e.status,
                        error=str(e),
                        message=f"Erreur HTTP {e.status} lors de la récupération de l'URL '{url}' (tentative {attempt}/{retries})."
                    )

                except asyncio.TimeoutError as e:
                    # Timeout
                    log_event(
                        action="http_request_timeout",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Timeout lors de la récupération de l'URL '{url}' (tentative {attempt}/{retries})."
                    )

                except Exception as e:
                    # Autres erreurs imprévues
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
                    # Log en cas d'échec complet après toutes les tentatives
                    log_event(
                        action="http_request_failed",
                        level="error",
                        url=url,
                        attempt=retries,
                        message=f"Échec complet après {retries} tentatives pour l'URL '{url}'."
                    )
                    raise Exception(f"Échec complet pour l'URL '{url}' après {retries} tentatives.")
                
    async def init_clubs_cache(self):
        """
        Charge tous les clubs existants en base (DB) pour la poule 'pool_id'
        et les place dans le cache local (_clubs_cache) avec priority=DB.
        """
        try:
            existing_clubs = await get_all_clubs(self.session) or []
            for c in existing_clubs:
                club_key = (c.id)
                
                # (existing_club, cloneMutable)
                if club_key not in self._clubs_cache:
                    self._clubs_cache[club_key] = (
                        c,           # existing_club
                        replace(c),  # updated_club (copie mutable)
                    )
            
            print(f"club 0594143: {self._clubs_cache.get('0594143')}")
            log_event(
                action="init_clubs_cache_ok",
                level="info",
                count=len(self._clubs_cache),
                message=f"[club_scraper] - Cache initialisé avec {len(self._clubs_cache)} clubs"
            )

        except Exception as e:
            log_event(
                action="init_clubs_cache_error",
                level="error",
                error=str(e),
                message="Erreur lors du chargement des clubs existants"
            )