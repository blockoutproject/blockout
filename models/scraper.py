from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
from typing import Optional
import aiohttp
from prometheus_client import Gauge
from api.matches_api import create_match, update_match, get_matches_by_pool
from config.logger_config import log_event, current_scraper
from models.category import Category
from models.datasource_priority import DataSourcePriority
from models.match import Match
from dataclasses import replace

class Scraper(ABC):
    _gauges = {}

    def __init__(
        self, 
        session: aiohttp.ClientSession, 
        name: str, 
        category: Category, 
        folder: str, 
        url: str = None, 
        priority_validation_enabled: bool = False
    ):
        self.session = session
        self.name = name
        self.category = category
        self.folder = folder
        self.url = url
        self.priority_validation_enabled = priority_validation_enabled

        # Cache local : dict[(league_code, match_code), (existing_match, updated_match, changes_list, priority)]
        self._matches_cache = {}
        # Optionnel : Pour tracer quels pools ont été scrappés
        self.scraped_pool_ids = set()

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
            await self.run_scraping()
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


    async def init_matches_cache(self, pool_id: int):
        """
        Charge tous les matchs existants en base (DB) pour la poule 'pool_id'
        et les place dans le cache local (_matches_cache) avec priority=DB.
        """
        try:
            existing_matches = await get_matches_by_pool(self.session, pool_id) or []
            for m in existing_matches:
                match_key = (m.league_code, m.match_code)
                
                # (existing_match, cloneMutable, changes_list, sourcePriority)
                if match_key not in self._matches_cache:
                    self._matches_cache[match_key] = (
                        m,           # existing_match
                        replace(m),  # updated_match (copie mutable)
                        [],
                        DataSourcePriority.DB
                    )

        except Exception as e:
            log_event(
                action="init_matches_cache_error",
                level="error",
                pool_id=pool_id,
                error=str(e),
                message="Erreur lors du chargement des matchs existants"
            )

    def schedule_match_changes(
        self,
        updated_match: Match, 
        prefix: str, 
        priority: DataSourcePriority
    ):
        """
        Fusionne le match dans le cache, avec logique de priorité (DB, FFVB, LNV-XML, LNV-HTML).
        """
        try:
            match_key = (updated_match.league_code, updated_match.match_code)

            # Si pas encore dans le cache, on l'ajoute
            if match_key not in self._matches_cache:
                self._matches_cache[match_key] = (None, updated_match, [], priority)

            existing_obj, updated_obj, changes_list, current_priority = self._matches_cache[match_key]

            # Champs
            lnv_priority_fields = ["match_date", "score", "set"]
            live_code_field = "live_code"
            general_fields = [
                "pool_id", "team_id_a", "team_id_b",
                "venue", "referee1", "referee2", "status"
            ]

            if self.priority_validation_enabled:
                # LNV-XML
                if priority == DataSourcePriority.LNV_XML:
                    for field_name in lnv_priority_fields:
                        old_val = getattr(updated_obj, field_name, None)
                        new_val = getattr(updated_match, field_name, None)
                        if new_val != old_val:
                            setattr(updated_obj, field_name, new_val)
                            changes_list.append(f"[{prefix}] {field_name}: {old_val} -> {new_val}")
                    self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, priority)

                # LNV-HTML
                elif priority == DataSourcePriority.LNV_HTML:
                    old_val = getattr(updated_obj, live_code_field, None)
                    new_val = getattr(updated_match, live_code_field, None)
                    if new_val != old_val:
                        setattr(updated_obj, live_code_field, new_val)
                        changes_list.append(f"[{prefix}] {live_code_field}: {old_val} -> {new_val}")
                    self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, priority)

                # FFVB
                elif priority == DataSourcePriority.FFVB:
                    for field_name in general_fields:
                        old_val = getattr(updated_obj, field_name, None)
                        new_val = getattr(updated_match, field_name, None)
                        if new_val != old_val and (old_val is None or priority >= current_priority):
                            setattr(updated_obj, field_name, new_val)
                            changes_list.append(f"[{prefix}] {field_name}: {old_val} -> {new_val}")
                    self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, current_priority)

            else:
                # Priorité désactivée : on écrase tout
                all_fields = lnv_priority_fields + [live_code_field] + general_fields
                for field_name in all_fields:
                    old_val = getattr(updated_obj, field_name, None)
                    new_val = getattr(updated_match, field_name, None)
                    if new_val != old_val:
                        setattr(updated_obj, field_name, new_val)
                        changes_list.append(f"[{prefix}] {field_name}: {old_val} -> {new_val}")

                self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, priority)

        except Exception as e:
            log_event(
                action="schedule_match_changes_error",
                level="error",
                match_code=updated_match.match_code,
                league_code=updated_match.league_code,
                error=str(e),
                message=f"Erreur lors de la fusion de match {updated_match.match_code}"
            )

    async def finalize_updates(self):
        """
        Parcourt tous les matchs du cache et crée ou met à jour en base.
        """
        for (league_code, match_code), (existing_obj, updated_obj, changes_list, priority) in self._matches_cache.items():
            try:
                if existing_obj is None:
                    # Nouveau match
                    await create_match(self.session, updated_obj)
                elif changes_list:
                    # Update
                    await update_match(self.session, updated_obj, changes_list)
                else:
                    continue
                
            except Exception as e:
                log_event(
                    action="finalize_update_error",
                    level="error",
                    match_code=updated_obj.match_code,
                    league_code=updated_obj.league_code,
                    error=str(e),
                    message=f"Erreur finalize match {updated_obj.match_code}"
                )

        self._matches_cache.clear()