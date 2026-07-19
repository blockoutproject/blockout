from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
from typing import Any, Mapping, Optional
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
        max_concurrency: int = 10
    ):
        self.session = session
        self.name = name
        self.url = url
        self._max_concurrency = max_concurrency
        self._sema = asyncio.Semaphore(self._max_concurrency)
        
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
            
    async def fetch(
        self,
        url: str,
        form_data: Mapping[str, Any],
        retries: int = 3,
        delay: int = 2,
        sem: int = 5,
        timeout: int = 20,
    ) -> str:
        """
        Récupère le contenu d'une URL via POST form-data,
        avec gestion des retries, timeout global et semaphore.
        """

        async with self._sema:
            for attempt in range(1, retries + 1):
                try:
                    client_timeout = aiohttp.ClientTimeout(total=timeout)

                    async with self.session.post(
                        url,
                        data=form_data,
                        ssl=False,
                        timeout=client_timeout,
                    ) as response:
                        response.raise_for_status()
                        raw_content = await response.content.read()

                        # Détection de l'encodage spécifique au domaine
                        if "ffvbbeach.org" in url or "ffvb.org" in url:
                            decoded_content = raw_content.decode("windows-1252", errors="replace")
                        else:
                            decoded_content = raw_content.decode("utf-8", errors="replace")

                        # Log succès après retry éventuel
                        if attempt > 1:
                            log_event(
                                action="http_request_retry_success",
                                level="info",
                                attempt=attempt,
                                url=url,
                                method="POST",
                                message=f"Succès après retry {attempt}/{retries} pour l'URL {url}."
                            )

                        return decoded_content

                except aiohttp.ClientConnectorDNSError as e:
                    log_event(
                        action="http_request_dns_error",
                        level="error",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Erreur DNS lors du POST '{url}' (tentative {attempt}/{retries})."
                    )

                except aiohttp.ClientConnectorError as e:
                    log_event(
                        action="http_request_connector_error",
                        level="error",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Erreur de connexion réseau lors du POST '{url}' (tentative {attempt}/{retries})."
                    )

                except aiohttp.ClientResponseError as e:
                    log_event(
                        action="http_request_http_error",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        status=e.status,
                        error=str(e),
                        message=f"Erreur HTTP {e.status} lors du POST '{url}' (tentative {attempt}/{retries})."
                    )

                except asyncio.TimeoutError as e:
                    log_event(
                        action="http_request_timeout",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Timeout lors du POST '{url}' (tentative {attempt}/{retries})."
                    )

                except Exception as e:
                    log_event(
                        action="http_request_unexpected_error",
                        level="error",
                        url=url,
                        attempt=attempt,
                        error=str(e),
                        message=f"Erreur inattendue lors du POST '{url}' (tentative {attempt}/{retries})."
                    )

                # Retry si échec
                if attempt < retries:
                    log_event(
                        action="http_request_retry",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        delay=delay,
                        message=f"Nouvelle tentative POST pour '{url}' après {delay} secondes."
                    )
                    await asyncio.sleep(delay)
                else:
                    # Échec final
                    log_event(
                        action="http_request_failed",
                        level="error",
                        url=url,
                        attempt=retries,
                        message=f"Échec complet après {retries} tentatives pour '{url}'."
                    )
                    raise Exception(f"Échec complet du POST '{url}' après {retries} tentatives.")
                
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

        except Exception as e:
            log_event(
                action="init_clubs_cache_error",
                level="error",
                error=str(e),
                message="Erreur lors du chargement des clubs existants"
            )