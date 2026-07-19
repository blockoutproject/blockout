from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
from typing import Optional
import aiohttp
from prometheus_client import Gauge
from api.competitions_api import get_active_team_associations_by_pool, update_team_association_stats
from api.matches_api import create_match, update_match, get_matches_by_pool
from config.logger_config import log_event, current_scraper
from models.association_stats import AssociationStats
from models.enums.datasource_priority import DataSourcePriority
from models.match import Match
from dataclasses import replace

from utils.logging_utils import to_loggable

class Scraper(ABC):
    _gauges = {}

    def __init__(
        self,
        session: aiohttp.ClientSession,
        name: str,
        url: str = None,
        priority_validation_enabled: bool = False,
        max_concurrency: int = 10
    ):
        self.session = session
        self.name = name
        self.url = url
        self.priority_validation_enabled = priority_validation_enabled
        self._max_concurrency = max_concurrency
        self._sema = asyncio.Semaphore(self._max_concurrency)

        # Cache local : dict[(leagueCode, matchCode), (existing_match, updated_match, changes_list, priority)]
        self._matches_cache: dict[
            tuple[str, str],
            tuple[Optional[Match], Match, list[str], DataSourcePriority]
        ] = {}
        # Cache pour gérer les points, matchs joués, matchs gagnés et perdus, etc ...
        self._associations_cache: dict[
            tuple[int, int],
            tuple[Optional[AssociationStats], AssociationStats]
        ] = {}

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

    async def fetch(self, url: str, retries: int = 3, delay: int = 5, timeout: int = 20) -> str:
        """
        Récupère le contenu d'une URL avec gestion des retries, timeout global et semaphore.
        """

        async with self._sema:  # Limiter les connexions simultanées
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
                        level="debug",
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
                        level="debug",
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
                        level="debug",
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

    async def init_matches_cache(self, poolId: int):
        """
        Charge tous les matchs existants en base (DB) pour la poule 'poolId'
        et les place dans le cache local (_matches_cache) avec priority=DB.
        """
        try:
            existing_matches = await get_matches_by_pool(self.session, poolId) or []
            for m in existing_matches:
                match_key = (m.leagueCode, m.matchCode)

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
                poolId=poolId,
                error=str(e),
                message="Erreur lors du chargement des matchs existants"
            )

    async def init_associations_cache(self, poolId: int):
        """
        Charge depuis la base les associations actives pour la poule `poolId`
        et les place dans le cache local (_associations_cache) sous la forme d'un tuple :
        (original, updated), où:
        - original : l'objet tel qu'il est en base
        - updated  : une copie mutable servant à accumuler les mises à jour issues du CSV.
        """
        try:
            active_assocs = await get_active_team_associations_by_pool(self.session, poolId) or []
            for assoc in active_assocs:
                key = (assoc.poolId, assoc.teamId)

                # On stocke l'association originale et une copie mutable
                assocDto = AssociationStats(
                    played=assoc.played,
                    wins=assoc.wins,
                    losses=assoc.losses,
                    points=assoc.points,
                    winsThreeToZero=assoc.winsThreeToZero,
                    winsThreeToOne=assoc.winsThreeToOne,
                    winsThreeToTwo=assoc.winsThreeToTwo,
                    lossesZeroToThree=assoc.lossesZeroToThree,
                    lossesOneToThree=assoc.lossesOneToThree,
                    lossesTwoToThree=assoc.lossesTwoToThree,
                    wonPoints=assoc.wonPoints,
                    lostPoints=assoc.lostPoints,
                    wonSets=assoc.wonSets,
                    lostSets=assoc.lostSets,
                    pointsPenalty=assoc.pointsPenalty,
                    coefSets=assoc.coefSets,
                    coefPoints=assoc.coefPoints
                )
                self._associations_cache[key] = (assocDto, AssociationStats())

        except Exception as e:
            log_event(
                action="init_associations_cache_error",
                level="error",
                poolId=poolId,
                error=str(e),
                message="Erreur lors du chargement des associations existantes"
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
            match_key = (updated_match.leagueCode, updated_match.matchCode)

            # Si pas encore dans le cache, on l'ajoute
            if match_key not in self._matches_cache:
                self._matches_cache[match_key] = (None, updated_match, [], priority)

            existing_obj, updated_obj, changes_list, current_priority = self._matches_cache.get(match_key)

            if updated_obj and existing_obj and not existing_obj.active:
                updated_obj.active = True
                changes_list.append(f"[{prefix}] Match réactivé")

            # Champs
            lnv_priority_fields = ["matchDate", "score", "set"]
            live_code_field = "liveCode"
            general_fields = [
                "poolId", "teamIdA", "teamIdB",
                "venue", "firstReferee", "secondReferee"
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
                matchCode=updated_match.matchCode,
                leagueCode=updated_match.leagueCode,
                error=str(e),
                message=f"Erreur lors de la fusion de match {updated_match.matchCode}"
            )

    def schedule_association_update(
        self,
        poolId: int,
        teamId: int,
        team_stats: AssociationStats
    ):
        """
        Ajoute dans le cache les statistiques pour l'association identifiée par (poolId, teamId).
        Les valeurs sont cumulées sur tout le CSV.
        """
        key = (poolId, teamId)

        if key not in self._associations_cache:
            self._associations_cache[key] = (None, AssociationStats())

        original, updated = self._associations_cache[key]

        try:
            updated.add(
                played=team_stats.played,
                wins=team_stats.wins,
                losses=team_stats.losses,
                points=team_stats.points,
                winsThreeToZero=team_stats.winsThreeToZero,
                winsThreeToOne=team_stats.winsThreeToOne,
                winsThreeToTwo=team_stats.winsThreeToTwo,
                lossesZeroToThree=team_stats.lossesZeroToThree,
                lossesOneToThree=team_stats.lossesOneToThree,
                lossesTwoToThree=team_stats.lossesTwoToThree,
                wonPoints=team_stats.wonPoints,
                lostPoints=team_stats.lostPoints,
                wonSets=team_stats.wonSets,
                lostSets=team_stats.lostSets,
                pointsPenalty=team_stats.pointsPenalty
            )
        except Exception as e:
            log_event(
                action="schedule_association_update_error",
                level="error",
                poolId=poolId,
                teamId=teamId,
                error=str(e),
                message="Erreur lors de l'ajout des statistiques pour l'association."
            )

    def schedule_association_replace(
        self,
        poolId: int,
        teamId: int,
        team_stats: AssociationStats
    ):
        """
        Remplace directement les champs 'played', 'wins', 'losses', 'points'
        dans l'association (poolId, teamId) du _associations_cache.
        """
        key = (poolId, teamId)
        if key not in self._associations_cache:
            self._associations_cache[key] = (None, AssociationStats())

        original, updated = self._associations_cache[key]

        updated.played=team_stats.played
        updated.wins=team_stats.wins
        updated.losses=team_stats.losses
        updated.points=team_stats.points
        updated.winsThreeToZero=team_stats.winsThreeToZero
        updated.winsThreeToOne=team_stats.winsThreeToOne
        updated.winsThreeToTwo=team_stats.winsThreeToTwo
        updated.lossesZeroToThree=team_stats.lossesZeroToThree
        updated.lossesOneToThree=team_stats.lossesOneToThree
        updated.lossesTwoToThree=team_stats.lossesTwoToThree
        updated.wonPoints=team_stats.wonPoints
        updated.lostPoints=team_stats.lostPoints
        updated.wonSets=team_stats.wonSets
        updated.lostSets=team_stats.lostSets
        updated.pointsPenalty=team_stats.pointsPenalty
        updated.pointsPenalty = abs(team_stats.points - updated.points)

    async def finalize_associations_updates(self):
        """
        Parcourt toutes les associations du cache et, pour chacune,
        si l'association est nouvelle (original is None) ou si les statistiques ont changé par rapport à l'original,
        effectue la mise à jour en base.
        Ensuite, le cache est vidé.
        """
        update_tasks = []
        for (poolId, teamId), (original, updated) in self._associations_cache.items():
            updated.coefSets = round(updated.wonSets / updated.lostSets, 3) if updated.lostSets > 0 else 1000.0
            updated.coefPoints = round(updated.wonPoints / updated.lostPoints, 3) if updated.lostPoints > 0 else 1000.0
            if original is None or original != updated:
                try:
                    update_tasks.append(
                        update_team_association_stats(self.session, poolId, teamId, updated)
                    )
                except Exception as e:
                    log_event(
                        action="finalize_associations_update_error",
                        level="error",
                        poolId=poolId,
                        teamId=teamId,
                        error=str(e),
                        message=f"Erreur lors de la mise à jour des stats pour l'association (pool: {poolId}, team: {teamId})."
                    )
        if update_tasks:
            await asyncio.gather(*update_tasks)
        self._associations_cache.clear()

    async def finalize_matches_updates(self):
        """
        Parcourt tous les matchs du cache et crée ou met à jour en base.
        """
        for (leagueCode, matchCode), (existing_obj, updated_obj, changes_list, priority) in self._matches_cache.items():
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
                    action="finalize_matches_update_error",
                    level="error",
                    matchCode=updated_obj.matchCode,
                    leagueCode=updated_obj.leagueCode,
                    error=str(e),
                    message=f"Erreur finalize match {updated_obj.matchCode}"
                )

        self._matches_cache.clear()