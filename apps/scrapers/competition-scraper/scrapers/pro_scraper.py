import asyncio
from dataclasses import replace
from datetime import datetime, timezone
import re
from typing import Optional, Tuple
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo
from bs4 import BeautifulSoup

from api.config_api import create_raw_division_mapping, get_raw_division_mappings_by_league_and_season
from api.pools_api import get_pools_by_league_and_season
from config.logger_config import log_event
from models.association_stats import AssociationStats
from models.enums.datasource_priority import DataSourcePriority
from models.pool import Pool
from models.raw_division_mapping import RawDivisionMapping
from models.scraper import Scraper
from services.matchs_service import find_match_in_cache
from services.teams_service import find_team_by_name_in_division_format_gender_season
from utils.match_utils import validate_set_format, validate_set_score_format
from utils.scraper_logic import handle_csv_download_and_parse
from utils.team_utils import get_full_name


class ProScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session,
            name="pro_scraper",
            priority_validation_enabled=True,
        )
        self.raw_season = "2026/2027"
        self.league_code = "AALNV"
        self.league_name = "Pro"
        self.pools_json = [
            {
                "pool_code": "MSL",
                "name": "Marmara SpikeLigue",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAM.xml",
            },
            {
                "pool_code": "PAZ",
                "name": "Marmara SpikeLigue - Playoffs",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAM.xml",
            },
            {
                "pool_code": "LBM",
                "name": "Ligue B Masculine",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=126",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LBM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LBM.xml",
            },
            {
                "pool_code": "SPS",
                "name": "Saforelle Power 6",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=124",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAF.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAF.xml",
            },
            {
                "pool_code": "FAZ",
                "name": "Saforelle Power 6 - Playoffs",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=124",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAF.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAF.xml",
            },
        ]

        self.pool_sema = asyncio.Semaphore(8)

    async def run_scraping(self):
        if self.session is None:
            raise ValueError("La session aiohttp est non initialisée ou fermée.")

        async def guarded(task_coro):
            async with self.pool_sema:
                return await task_coro

        try:
            existing_pools = await get_pools_by_league_and_season(self.session, self.league_code, self.raw_season)
            existing_pools = existing_pools or []
            existing_pools_dict = {
                (pool.pool_code, pool.league_code, pool.season): pool
                for pool in existing_pools
            }

            raw_mappings = await get_raw_division_mappings_by_league_and_season(
                self.session, self.league_code, self.raw_season
            )
            raw_mappings = raw_mappings or []
            mapping_dict = {m.raw_division_name: m for m in raw_mappings}

            tasks = []
            for pool_json in self.pools_json:
                try:
                    name = pool_json["name"]
                    pool_code = pool_json["pool_code"]
                    mapping = mapping_dict.get(name)

                    if not mapping:
                        new_mapping = RawDivisionMapping(
                            raw_division_name=name,
                            league_code=self.league_code,
                            season=self.raw_season,
                        )
                        created_mapping = await create_raw_division_mapping(self.session, new_mapping)
                        mapping_dict[name] = created_mapping
                        continue

                    if not mapping.is_mapped():
                        continue

                    pool_obj = Pool(
                        pool_code=pool_code,
                        league_code=self.league_code,
                        season=self.raw_season,
                        league_name=self.league_name,
                        raw_name=name,
                        name=name,
                        short_name=name,
                        division_id=mapping.division_id,
                        format=mapping.format,
                        gender=mapping.gender,
                    )

                    existing_pool = existing_pools_dict.get((pool_obj.pool_code, pool_obj.league_code, pool_obj.season))

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
            await handle_csv_download_and_parse(self, pool, raw_season, existing_pool=existing_pool)
            await self.parse_and_update_matches(lnv_xml_matches_url, lnv_xml_rank_url, pool)
            await self.add_match_live_code(lnv_url, pool)
        except Exception as e:
            log_event(
                action="task_chain_error",
                level="error",
                pool_code=pool.pool_code,
                error=repr(e),
                message="Erreur lors de l'exécution de la chaîne de tâches pour une poule.",
            )

    async def parse_and_update_matches(self, lnv_xml_matches_url: str, lnv_xml_rank_url: str, pool: Pool):
        try:
            xml_matches_content = await self.fetch(lnv_xml_matches_url)
            xml_rank_content = await self.fetch(lnv_xml_rank_url)

            if not xml_matches_content:
                log_event(
                    action="fetch_xml_matches_error",
                    level="error",
                    pool_id=pool.id,
                    url=lnv_xml_matches_url,
                    message="Erreur lors de la récupération du flux XML pour les matchs.",
                )
                return

            if not xml_rank_content:
                log_event(
                    action="fetch_xml_rank_error",
                    level="error",
                    pool_id=pool.id,
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
                pool_id=pool.id,
                message=repr(e),
            )

    async def process_xml_matches(self, matches_root: ET.Element, pool_id: int):
        try:
            for match_el in matches_root.findall(".//Match"):
                match_code = (match_el.findtext("CodeMatch") or "").strip()
                if not match_code:
                    continue

                match_key = (self.league_code, match_code)

                date_str = (match_el.findtext("Date") or "01-01-1970").strip()
                heure_str = (match_el.findtext("Heure") or "00:00:00").strip()

                naive = datetime.strptime(f"{date_str} {heure_str}", "%d-%m-%Y %H:%M:%S")
                paris_time = naive.replace(tzinfo=ZoneInfo("Europe/Paris"))
                match_datetime = paris_time.astimezone(timezone.utc)

                set_value = validate_set_format(match_el.findtext("Score"))

                score_details = []
                for i in range(1, 6):
                    set_score = validate_set_score_format(match_el.findtext(f"Set{i}"))
                    if set_score and set_score != "0-0":
                        score_details.append(set_score)
                score_str = ",".join(score_details)

                cache_entry = self._matches_cache.get(match_key)
                existing_match = cache_entry[1] if cache_entry else None
                if not existing_match:
                    continue

                updated_match = replace(existing_match)
                updated_match.match_date = match_datetime

                if set_value and set_value != "0-0":
                    updated_match.set = set_value
                if score_str:
                    updated_match.score = score_str

                self.schedule_match_changes(
                    updated_match=updated_match,
                    prefix="LNV-XML",
                    priority=DataSourcePriority.LNV_XML,
                )

        except Exception as e:
            log_event(
                action="process_xml_matches_error",
                level="error",
                pool_id=pool_id,
                message=repr(e),
            )

    async def process_xml_rank(self, rank_root: ET.Element, pool: Pool):
        try:
            for competition_el in rank_root.findall(".//Competition"):
                for equipe_el in competition_el.findall(".//Equipe"):
                    nom_club = (equipe_el.get("NomClub") or "").strip()

                    points = int(equipe_el.findtext("Points", default="0"))
                    mj = int(equipe_el.findtext("MatchsJoues", default="0"))
                    mg = int(equipe_el.findtext("MatchsGagnes", default="0"))
                    mp = int(equipe_el.findtext("MatchsPerdus", default="0"))

                    r_3_0 = int(equipe_el.findtext("Resultat_3_0", default="0"))
                    r_3_1 = int(equipe_el.findtext("Resultat_3_1", default="0"))
                    r_3_2 = int(equipe_el.findtext("Resultat_3_2", default="0"))
                    r_2_3 = int(equipe_el.findtext("Resultat_2_3", default="0"))
                    r_1_3 = int(equipe_el.findtext("Resultat_1_3", default="0"))
                    r_0_3 = int(equipe_el.findtext("Resultat_0_3", default="0"))

                    set_pour = int(equipe_el.findtext("SetPour", default="0"))
                    set_contre = int(equipe_el.findtext("SetContre", default="0"))
                    ratio_set = float(equipe_el.findtext("RatioSet", default="0") or 0)

                    pts_pour = int(equipe_el.findtext("PointsPour", default="0"))
                    pts_contre = int(equipe_el.findtext("PointsContre", default="0"))
                    ratio_pts = float(equipe_el.findtext("RatioPoints", default="0") or 0)

                    full_name = get_full_name(nom_club, pool.gender)
                    if not full_name:
                        continue

                    team = await find_team_by_name_in_division_format_gender_season(
                        self.session,
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
                            pool_id=pool.id,
                            name=full_name,
                            message="Aucune équipe trouvée pour ce nom.",
                        )
                        continue

                    team_stats = AssociationStats()
                    team_stats.add(
                        played=mj,
                        wins=mg,
                        losses=mp,
                        points=points,
                        wins_three_to_zero=r_3_0,
                        wins_three_to_one=r_3_1,
                        wins_three_to_two=r_3_2,
                        losses_zero_to_three=r_0_3,
                        losses_one_to_three=r_1_3,
                        losses_two_to_three=r_2_3,
                        won_sets=set_pour,
                        lost_sets=set_contre,
                        won_points=pts_pour,
                        lost_points=pts_contre,
                        points_penalty=0,
                    )

                    team_stats.coef_sets = ratio_set
                    team_stats.coef_points = ratio_pts

                    self.schedule_association_replace(
                        pool_id=pool.id,
                        team_id=team.id,
                        team_stats=team_stats,
                    )

        except Exception as e:
            log_event(
                action="process_xml_rank_error",
                level="error",
                pool_id=pool.id,
                message=repr(e),
            )

    async def add_match_live_code(self, url: str, pool: Pool):
        html_content = await self.fetch(url)
        if not html_content:
            log_event(
                action="fetch_html_error",
                level="error",
                pool_id=pool.id,
                url=url,
                message="Erreur lors de la récupération de la page HTML pour les live codes.",
            )
            return

        soup = BeautifulSoup(html_content, "html.parser")
        main_id = await self.extract_main_id(soup)
        if not main_id:
            log_event(
                action="missing_main_id",
                level="error",
                pool_id=pool.id,
                message="Impossible de trouver l'identifiant principal.",
            )
            return

        await self.process_all_days(soup, main_id, pool)

    async def extract_main_id(self, soup: BeautifulSoup) -> Optional[str]:
        span = soup.find("span", id=re.compile(r"Content_Main_(\d+)_userControl_lbl_title"))
        if not span:
            return None
        match_ = re.search(r"Content_Main_(\d+)_userControl_lbl_title", span.get("id", ""))
        return match_.group(1) if match_ else None

    async def process_all_days(self, soup: BeautifulSoup, main_id: str, pool: Pool):
        total_days = 0
        while True:
            day_block = soup.find(
                id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RPL_Leg"
            )
            if not day_block:
                break
            await self.process_matches_in_day(soup, main_id, total_days, pool)
            total_days += 2

    async def process_matches_in_day(self, soup: BeautifulSoup, main_id: str, total_days: int, pool: Pool):
        async def run_limited(coros, limit=20):
            sem = asyncio.Semaphore(limit)

            async def wrap(c):
                async with sem:
                    return await c

            return await asyncio.gather(*(wrap(c) for c in coros))

        match_count = 0
        coros = []

        while True:
            match_block = soup.find(
                id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RADLIST_Matches_ctrl{match_count}_RPL_Match"
            )
            if not match_block:
                break

            coros.append(self.process_match_block(match_block, pool))
            match_count += 2

        if coros:
            await run_limited(coros, limit=20)

    async def process_match_block(self, match_block, pool: Pool):
        mID = self.extract_match_id(match_block)

        home_name, guest_name = self.extract_teams(match_block)
        home_team_full = get_full_name(home_name, pool.gender) if home_name else None
        guest_team_full = get_full_name(guest_name, pool.gender) if guest_name else None

        if home_name and not home_team_full:
            log_event(
                action="missing_name",
                level="error",
                pool_id=pool.id,
                raw_name=home_name,
                message="Nom d'équipe domicile non trouvé dans les alias.",
            )
        if guest_name and not guest_team_full:
            log_event(
                action="missing_name",
                level="error",
                pool_id=pool.id,
                raw_name=guest_name,
                message="Nom d'équipe visiteur non trouvé dans les alias.",
            )

        date_time = match_block.find("span", id=re.compile("LB_DataOra"))
        if not date_time:
            return

        match_date_text = date_time.get_text(strip=True)
        parsed_match_date = datetime.strptime(match_date_text, "%d/%m/%Y - %H:%M").date()

        if not (home_team_full and guest_team_full):
            return

        team_a = await find_team_by_name_in_division_format_gender_season(
            self.session,
            pool.division_id,
            pool.format,
            pool.gender,
            pool.season,
            home_team_full,
        )
        team_b = await find_team_by_name_in_division_format_gender_season(
            self.session,
            pool.division_id,
            pool.format,
            pool.gender,
            pool.season,
            guest_team_full,
        )

        if not (team_a and team_b and mID):
            return

        existing_match = find_match_in_cache(self, pool.id, team_a.id, team_b.id, parsed_match_date)
        if not existing_match:
            return

        updated_match = replace(existing_match)
        updated_match.live_code = int(mID)

        self.schedule_match_changes(
            updated_match=updated_match,
            prefix="LNV-Live",
            priority=DataSourcePriority.LNV_HTML,
        )

    def extract_match_id(self, match_block) -> Optional[str]:
        onclick_attr = match_block.find("div", onclick=True)
        if not onclick_attr:
            return None
        mID_match = re.search(r"mID=(\d+)", onclick_attr.get("onclick", ""))
        return mID_match.group(1) if mID_match else None

    def extract_teams(self, match_block) -> Tuple[Optional[str], Optional[str]]:
        team_home = match_block.find("span", id=re.compile("Label2|Label6"))
        team_guest = match_block.find("span", id=re.compile("Label4|Label7"))
        home_name = team_home.get_text(strip=True) if team_home else None
        guest_name = team_guest.get_text(strip=True) if team_guest else None
        return home_name, guest_name