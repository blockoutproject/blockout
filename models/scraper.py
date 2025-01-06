from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
from typing import Optional
import aiohttp
from prometheus_client import Gauge
from api.matches_api import create_match, update_match
from config.logger_config import log_event
from models.datasource_priority import DataSourcePriority
from models.match import Match
from config.logger_config import current_scraper
from dataclasses import replace

class Scraper(ABC):
    # Stocker un Gauge unique par classe de scraper
    _gauges = {}

    def __init__(self, session: aiohttp.ClientSession, name: str, priority_validation_enabled=False):
        self.session = session
        self.name = name
        self._matches_cache: dict[tuple[str, str], tuple[Optional[Match], Match, list[str], DataSourcePriority]]  = {}
        self.priority_validation_enabled = priority_validation_enabled

        # Récupérer ou créer le Gauge pour la classe en cours
        class_name = self.__class__.__name__.lower()
        if class_name not in Scraper._gauges:
            Scraper._gauges[class_name] = Gauge(
                f"{class_name}_scraping_duration_seconds",
                f"Durée du scraping pour le scraper {class_name}"
            )
        self.scraping_duration_gauge = Scraper._gauges[class_name]
        
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
            
    def schedule_match_changes(self, existing_match: Match, updated_match: Match, prefix: str = "CSV", priority: DataSourcePriority = DataSourcePriority.FFVB):
        """
        Stocke/fusionne un match dans le cache du scraper, avec ou sans priorités,
        en fonction du contexte du scraper.
        """
        try:
            match_key = (updated_match.league_code, updated_match.match_code)

            # Initialisation dans le cache si nécessaire
            if match_key not in self._matches_cache:
                if existing_match:
                    # (matchEnBase, cloneMutable, listeDeModifs, sourcePrioritaire)
                    self._matches_cache[match_key] = (
                        existing_match,
                        replace(existing_match),
                        [],
                        DataSourcePriority.DB  # La base de données est la source initiale
                    )
                else:
                    # Nouveau match
                    self._matches_cache[match_key] = (None, updated_match, [], priority)

            # Chargement des données existantes
            existing_obj, updated_obj, changes_list, current_priority = self._matches_cache[match_key]

            # Liste des champs selon leur priorité
            lnv_priority_fields = ["match_date", "score", "set"]  # Champs prioritaires pour LNV-XML
            live_code_field = "live_code"  # Champ prioritaire pour LNV-HTML
            general_fields = [
                "pool_id", "team_id_a", "team_id_b",
                "venue", "referee1", "referee2", "status"
            ]  # Champs généraux (FFVB ou LNV si non défini)

            # Priorité activée : respect des règles de priorité
            if self.priority_validation_enabled:
                # Synchroniser les champs prioritaires pour LNV-XML
                if priority == DataSourcePriority.LNV_XML:
                    for field_name in lnv_priority_fields:
                        new_val = getattr(updated_match, field_name, None)
                        old_val = getattr(updated_obj, field_name, None)
                        if new_val != old_val:
                            setattr(updated_obj, field_name, new_val)
                            changes_list.append(f"[{prefix}] {field_name}: {old_val} -> {new_val}")
                    # Mise à jour de la priorité de la source pour ces champs
                    self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, priority)

                # Synchroniser le champ prioritaire pour LNV-HTML
                elif priority == DataSourcePriority.LNV_HTML:
                    new_val = getattr(updated_match, live_code_field, None)
                    old_val = getattr(updated_obj, live_code_field, None)
                    if new_val != old_val:
                        setattr(updated_obj, live_code_field, new_val)
                        changes_list.append(f"[{prefix}] {live_code_field}: {old_val} -> {new_val}")
                    # Mise à jour de la priorité de la source pour ce champ
                    self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, priority)

                # Synchroniser les champs généraux pour FFVB
                elif priority == DataSourcePriority.FFVB:
                    for field_name in general_fields:
                        new_val = getattr(updated_match, field_name, None)
                        old_val = getattr(updated_obj, field_name, None)
                        # Mise à jour uniquement si aucune valeur existante (ou valeur identique)
                        if new_val != old_val and (old_val is None or priority >= current_priority):
                            setattr(updated_obj, field_name, new_val)
                            changes_list.append(f"[{prefix}] {field_name}: {old_val} -> {new_val}")
                    # Mise à jour de la priorité de la source pour ces champs
                    self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, current_priority)

            # Priorité désactivée : synchronisation directe
            else:
                all_fields = lnv_priority_fields + [live_code_field] + general_fields
                for field_name in all_fields:
                    new_val = getattr(updated_match, field_name, None)
                    old_val = getattr(updated_obj, field_name, None)
                    if new_val != old_val:
                        setattr(updated_obj, field_name, new_val)
                        changes_list.append(f"[{prefix}] {field_name}: {old_val} -> {new_val}")
                # Mise à jour de la source sans gérer la priorité
                self._matches_cache[match_key] = (existing_obj, updated_obj, changes_list, priority)

        except Exception as e:
            log_event(
                action="schedule_match_changes_error",
                level="error",
                match_code=updated_match.match_code,
                league_code=updated_match.league_code,
                error=str(e),
                message=f"Erreur lors de la fusion des changements pour le match {updated_match.match_code}."
            )

    async def finalize_updates(self):
        """
        Parcourt tous les matchs du cache et applique effectivement
        les modifications (create ou update) en base.
        """
        for (league_code, match_code), (existing_match, updated_match, changes_list, priority) in self._matches_cache.items():
            if not changes_list:
                continue  # Pas de changement, on ignore

            try:
                if existing_match is None:
                    # Nouveau match
                    await create_match(self.session, updated_match, changes_list)
                else:
                    # Match existant => update
                    await update_match(self.session, updated_match, changes_list)
            except Exception as e:
                log_event(
                    action="finalize_update_error",
                    level="error",
                    match_code=updated_match.match_code,
                    league_code=updated_match.league_code,
                    error=str(e),
                    message=f"Erreur lors de l'application des changements pour le match {updated_match.match_code}."
                )

        # On vide le cache pour la suite
        self._matches_cache.clear()