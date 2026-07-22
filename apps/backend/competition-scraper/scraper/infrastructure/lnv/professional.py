import asyncio
import xml.etree.ElementTree as ET
from dataclasses import replace
from datetime import date

import aiohttp
import httpx
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.pool.api.pool_api import PoolApi
from blockout_contract_clients.team.api.team_api import TeamApi

from scraper.application.calendar_ingestion import handle_csv_download_and_parse
from scraper.application.models import Pool, RawDivisionMapping, Team
from scraper.application.source import Scraper
from scraper.application.team_writer import (
    find_team_by_name_in_division_format_gender_season,
)
from scraper.domain.data_source_priority import DataSourcePriority
from scraper.domain.team import get_full_name
from scraper.infrastructure.blockout.configuration import (
    create_raw_division_mapping,
    get_raw_division_mappings_by_league_and_season,
)
from scraper.infrastructure.blockout.match import MatchInternalResponse
from scraper.infrastructure.blockout.pools import get_pools_by_league_and_season
from scraper.infrastructure.blockout.teams import get_teams
from scraper.infrastructure.lnv.parsers import (
    LnvLiveMatch,
    parse_live_matches,
    parse_matches,
    parse_rankings,
)
from scraper.observability.logging import log_event


class ProScraper(Scraper):
    def __init__(
        self,
        session: aiohttp.ClientSession,
        provider_client: httpx.AsyncClient,
        raw_division_mapping_api: RawDivisionMappingApi | None = None,
        team_api: TeamApi | None = None,
        pool_api: PoolApi | None = None,
    ) -> None:
        super().__init__(
            session,
            provider_client,
            name="pro_scraper",
            raw_division_mapping_api=raw_division_mapping_api,
            team_api=team_api,
            pool_api=pool_api,
            priority_validation_enabled=True,
        )
        self.raw_season = "2026/2027"
        self.leagueCode = "AALNV"
        self.leagueName = "Pro"
        self.pools_json = [
            {
                "poolCode": "MSL",
                "name": "Marmara SpikeLigue",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAM.xml",
            },
            {
                "poolCode": "PAZ",
                "name": "Marmara SpikeLigue - Playoffs",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAM.xml",
            },
            {
                "poolCode": "LBM",
                "name": "Ligue B Masculine",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=126",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LBM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LBM.xml",
            },
            {
                "poolCode": "SPS",
                "name": "Saforelle Power 6",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=124",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAF.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAF.xml",
            },
            {
                "poolCode": "FAZ",
                "name": "Saforelle Power 6 - Playoffs",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=124",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAF.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAF.xml",
            },
        ]

        self.pool_sema = asyncio.Semaphore(8)
        self._live_documents: dict[str, str] = {}
        self._live_document_locks: dict[str, asyncio.Lock] = {}

    def _config_api(self) -> RawDivisionMappingApi:
        if self.raw_division_mapping_api is None:
            raise RuntimeError("The generated config-service client is not configured.")
        return self.raw_division_mapping_api

    async def run_scraping(self):
        if self.session is None:
            raise ValueError("La session aiohttp est non initialisée ou fermée.")
        self._live_documents.clear()

        async def guarded(task_coro):
            async with self.pool_sema:
                return await task_coro

        try:
            existing_pools = await get_pools_by_league_and_season(
                self.pools_api(), self.leagueCode, self.raw_season
            )
            existing_pools = existing_pools or []
            existing_pools_dict = {
                (pool.pool_code, pool.league_code, pool.season): pool
                for pool in existing_pools
            }

            raw_mappings = await get_raw_division_mappings_by_league_and_season(
                self._config_api(), self.leagueCode, self.raw_season
            )
            raw_mappings = raw_mappings or []
            mapping_dict = {m.raw_division_name: m for m in raw_mappings}

            tasks = []
            for pool_json in self.pools_json:
                try:
                    name = pool_json["name"]
                    poolCode = pool_json["poolCode"]
                    mapping = mapping_dict.get(name)

                    if not mapping:
                        new_mapping = RawDivisionMapping(
                            raw_division_name=name,
                            league_code=self.leagueCode,
                            season=self.raw_season,
                        )
                        created_mapping = await create_raw_division_mapping(
                            self._config_api(), new_mapping
                        )
                        mapping_dict[name] = created_mapping
                        continue

                    if not mapping.is_mapped():
                        continue

                    pool_obj = Pool(
                        pool_code=poolCode,
                        league_code=self.leagueCode,
                        season=self.raw_season,
                        league_name=self.leagueName,
                        raw_name=name,
                        name=name,
                        short_name=name,
                        division_id=mapping.division_id,
                        format=mapping.format,
                        gender=mapping.gender,
                    )

                    existing_pool = existing_pools_dict.get(
                        (pool_obj.pool_code, pool_obj.league_code, pool_obj.season)
                    )

                    tasks.append(
                        guarded(
                            self.execute_task_chain(
                                pool=pool_obj,
                                existing_pool=existing_pool,
                                raw_season=self.raw_season,
                                lnv_url=pool_json["lnv_url"],
                                lnv_xml_matches_url=pool_json["lnv_xml_matches_url"],
                                lnv_xml_rank_url=pool_json["lnv_xml_rank_url"],
                            )
                        )
                    )

                except Exception as e:
                    log_event(
                        action="pool_processing_error",
                        level="error",
                        name=pool_json.get("name"),
                        error=repr(e),
                    )

            if tasks:
                await asyncio.gather(*tasks)

            await self.finalize_matches_updates()
            await self.finalize_associations_updates()

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                error=repr(e),
                message="Erreur critique lors du scraping des poules professionnelles.",
            )

    async def execute_task_chain(
        self,
        pool: Pool,
        existing_pool: Pool,
        raw_season: str,
        lnv_url: str,
        lnv_xml_matches_url: str,
        lnv_xml_rank_url: str,
    ):
        try:
            await handle_csv_download_and_parse(
                self, pool, raw_season, existing_pool=existing_pool
            )
            await self.parse_and_update_matches(
                lnv_xml_matches_url, lnv_xml_rank_url, pool
            )
            await self.add_match_live_code(lnv_url, pool)
        except Exception as e:
            log_event(
                action="task_chain_error",
                level="error",
                poolCode=pool.pool_code,
                error=repr(e),
                message="Erreur lors de l'exécution de la chaîne de tâches pour une poule.",
            )

    async def parse_and_update_matches(
        self,
        lnv_xml_matches_url: str,
        lnv_xml_rank_url: str,
        pool: Pool,
    ):
        try:
            xml_matches_content = await self.fetch(lnv_xml_matches_url)
            xml_rank_content = await self.fetch(lnv_xml_rank_url)

            if not xml_matches_content:
                log_event(
                    action="fetch_xml_matches_error",
                    level="error",
                    poolId=pool.id,
                    url=lnv_xml_matches_url,
                    message="Erreur lors de la récupération du flux XML pour les matchs.",
                )
                return

            if not xml_rank_content:
                log_event(
                    action="fetch_xml_rank_error",
                    level="error",
                    poolId=pool.id,
                    url=lnv_xml_rank_url,
                    message="Erreur lors de la récupération du flux XML pour le classement.",
                )
                return

            matches_root = ET.fromstring(xml_matches_content)
            await self.process_xml_matches(matches_root, pool.id)

            rank_root = ET.fromstring(xml_rank_content)
            await self.process_xml_rank(rank_root, pool)

        except Exception as e:
            log_event(
                action="parse_and_update_matches_error",
                level="error",
                poolId=pool.id,
                message=repr(e),
            )

    async def process_xml_matches(self, matches_root: ET.Element, poolId: int):
        try:
            for provider_match in parse_matches(matches_root):
                match_key = (self.leagueCode, provider_match.code)
                cache_entry = self._matches_cache.get(match_key)
                existing_match = cache_entry[1] if cache_entry else None
                if not existing_match:
                    continue

                updated_match = replace(existing_match)
                updated_match.matchDate = provider_match.match_date
                if provider_match.set_score:
                    updated_match.set = provider_match.set_score
                if provider_match.points_score:
                    updated_match.score = provider_match.points_score

                self.schedule_match_changes(
                    updated_match=updated_match,
                    prefix="LNV-XML",
                    priority=DataSourcePriority.LNV_XML,
                )

        except Exception as e:
            log_event(
                action="process_xml_matches_error",
                level="error",
                poolId=poolId,
                message=repr(e),
            )

    async def process_xml_rank(self, rank_root: ET.Element, pool: Pool):
        try:
            for ranking in parse_rankings(rank_root):
                full_name = get_full_name(ranking.team_name, pool.gender)
                if not full_name:
                    continue
                team = await find_team_by_name_in_division_format_gender_season(
                    self.teams_api(),
                    pool.division_id,
                    pool.format,
                    pool.gender,
                    pool.season,
                    full_name,
                )
                if not team:
                    log_event(
                        action="team_not_found",
                        level="error",
                        poolId=pool.id,
                        name=full_name,
                        message="Aucune équipe trouvée pour ce nom.",
                    )
                    continue
                self.schedule_association_replace(
                    poolId=pool.id,
                    teamId=team.id,
                    team_stats=ranking.stats,
                )

        except Exception as e:
            log_event(
                action="process_xml_rank_error",
                level="error",
                poolId=pool.id,
                message=repr(e),
            )

    async def add_match_live_code(self, url: str, pool: Pool) -> None:
        """Enrich one pool from a single parsed Data Project page."""
        html_content = await self._fetch_live_page(url)
        if not html_content:
            log_event(
                action="fetch_html_error",
                level="error",
                poolId=pool.id,
                url=url,
                message="Erreur lors de la récupération de la page HTML pour les live codes.",
            )
            return

        try:
            provider_matches = parse_live_matches(html_content)
        except (TypeError, ValueError) as error:
            log_event(
                action="parse_live_html_error",
                level="error",
                poolId=pool.id,
                error=repr(error),
            )
            return
        teams = (
            await get_teams(
                self.teams_api(),
                pool.division_id,
                pool.format,
                pool.gender,
                pool.season,
            )
            or []
        )
        teams_by_name = {team.raw_name.strip().casefold(): team for team in teams}
        matches_by_identity = {
            (
                candidate.poolId,
                candidate.teamIdA,
                candidate.teamIdB,
                candidate.matchDate.date(),
            ): candidate
            for _, candidate, _, _ in self._matches_cache.values()
            if candidate.matchDate
        }
        for provider_match in provider_matches:
            self._apply_live_match(
                provider_match, pool, teams_by_name, matches_by_identity
            )

    async def _fetch_live_page(self, url: str) -> str:
        """Fetch each shared Data Project document at most once per scraper run."""
        lock = self._live_document_locks.setdefault(url, asyncio.Lock())
        async with lock:
            if url not in self._live_documents:
                self._live_documents[url] = await self.fetch(url)
            return self._live_documents[url]

    def _apply_live_match(
        self,
        provider_match: LnvLiveMatch,
        pool: Pool,
        teams_by_name: dict[str, Team],
        matches_by_identity: dict[
            tuple[int | None, int, int, date], MatchInternalResponse
        ],
    ) -> None:
        home_team_full = get_full_name(provider_match.home_name, pool.gender)
        guest_team_full = get_full_name(provider_match.guest_name, pool.gender)

        if not home_team_full:
            log_event(
                action="missing_name",
                level="error",
                poolId=pool.id,
                rawName=provider_match.home_name,
                message="Nom d'équipe domicile non trouvé dans les alias.",
            )
        if not guest_team_full:
            log_event(
                action="missing_name",
                level="error",
                poolId=pool.id,
                rawName=provider_match.guest_name,
                message="Nom d'équipe visiteur non trouvé dans les alias.",
            )

        if not (home_team_full and guest_team_full):
            return

        team_a = teams_by_name.get(home_team_full.strip().casefold())
        team_b = teams_by_name.get(guest_team_full.strip().casefold())

        if not (team_a and team_b):
            return

        existing_match = matches_by_identity.get(
            (pool.id, team_a.id, team_b.id, provider_match.match_date)
        )
        if not existing_match:
            return

        updated_match = replace(existing_match)
        updated_match.liveCode = provider_match.live_code

        self.schedule_match_changes(
            updated_match=updated_match,
            prefix="LNV-Live",
            priority=DataSourcePriority.LNV_HTML,
        )
