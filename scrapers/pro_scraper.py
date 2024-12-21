import asyncio
from dataclasses import replace
from datetime import datetime
import re
from typing import Optional, Tuple
from bs4 import BeautifulSoup
from api.matches_api import get_active_matches_by_pool_id, get_match_by_pool_teams_date, update_match
from api.pools_api import get_pools_by_league_and_season
from api.teams_api import get_team_by_pool_and_name
from models.match import Match, MatchStatus
from models.pool import Pool, PoolDivisionCode
from models.scraper import Scraper
from services.pools_service import add_or_update_pool
from utils.file_utils import create_output_directory, delete_output_directory
from utils.scraper_logic import handle_csv_download_and_parse
from utils.team_utils import get_full_team_name
from utils.utils import parse_season
import xml.etree.ElementTree as ET
from config.logger_config import log_event, logger


class ProScraper(Scraper):
    def __init__(self, session):
        super().__init__(session, name="pro_scraper")
        self.folder = create_output_directory("Pro")
        self.raw_season = "2024/2025"
        self.parsed_season = parse_season(self.raw_season)
        self.league_code = "AALNV"
        self.league_name = "PRO"
        self.pools_json = [
            {"code": "MSL", "pool_name": "Marmara SpikeLigue", "division_name": "Marmara SpikeLigue", "gender": "M", "lnv_url": "http://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=115", "lnv_xml_url": "https://www.lnv.fr/xml/calendrier-LAM.xml"},
            {"code": "LBM", "pool_name": "Ligue B Masculine", "division_name": "Ligue B Masculine", "gender": "M", "lnv_url": "http://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=116", "lnv_xml_url": "https://www.lnv.fr/xml/calendrier-LBM.xml"},
            {"code": "LAF", "pool_name": "Saforelle Power 6", "division_name": "Saforelle Power 6", "gender": "F", "lnv_url": "http://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=113", "lnv_xml_url": "https://www.lnv.fr/xml/calendrier-LAF.xml"},
        ]

    async def run_scraping(self):
        if self.session is None:
            raise ValueError("La session aiohttp est non initialisée ou fermée.")

        tasks = []

        try:
            existing_pools = await get_pools_by_league_and_season(self.session, self.league_code, self.parsed_season)
            existing_pools_dict = {(pool.pool_code, pool.league_code, pool.season): pool for pool in existing_pools}

            for pool_json in self.pools_json:
                try:
                    pool_data = {
                        "pool_code": pool_json['code'],
                        "league_code": self.league_code,
                        "season": self.parsed_season,
                        "league_name": self.league_name,
                        "pool_name": pool_json['pool_name'],
                        "division_code": PoolDivisionCode.PRO,
                        "division_name": pool_json['division_name'],
                        "gender": pool_json['gender']
                    }
                    pool = Pool(**pool_data)

                    key = (pool.pool_code, pool.league_code, pool.season)
                    existing_pool = existing_pools_dict.get(key)
                    new_pool = await add_or_update_pool(self.session, pool, existing_pool)

                    if new_pool:
                        tasks.append(self.execute_task_chain(
                            new_pool, self.raw_season, self.folder, pool_json['lnv_url'], pool_json['lnv_xml_url']
                        ))
                except Exception as e:
                    log_event(
                        action="pool_processing_error",
                        level="error",
                        pool_name=pool_json['pool_name'],
                        error=str(e)
                    )

            await asyncio.gather(*tasks)

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                error=str(e),
                message="Erreur critique lors du scraping des poules professionnelles."
            )
        finally:
            delete_output_directory(self.folder)

    async def execute_task_chain(self, pool: Pool, season, folder, lnv_url, lnv_xml_url):
        await handle_csv_download_and_parse(self.session, pool, season, folder)
        await self.parse_and_update_matches(lnv_xml_url, pool.id)
        await self.add_match_live_code(lnv_url, pool.id, pool.gender)

    async def parse_and_update_matches(self, xml_url, pool_id):
        xml_content = await self.fetch(xml_url)
        if not xml_content:
            log_event(
                action="fetch_xml_error",
                level="error",
                pool_id=pool_id,
                url=xml_url,
                message="Erreur lors de la récupération du flux XML."
            )
            return

        root = ET.fromstring(xml_content)
        existing_matches = await get_active_matches_by_pool_id(self.session, pool_id)
        for match in root.findall(".//Match"):
            await self.process_xml_match(match, existing_matches)

    async def process_xml_match(self, match, existing_matches: Optional[list[Match]]):
        code_match = match.find("CodeMatch").text
        match_date = match.find("Date").text + " " + match.find("Heure").text
        set = match.find("Score").text

        match_datetime = datetime.strptime(match_date, "%d-%m-%Y %H:%M:%S")
        existing_match = next((m for m in existing_matches if m.match_code == code_match), None)

        if existing_match:
            updated_match = self.prepare_updated_match(existing_match, match_datetime, set)
            await self.apply_match_updates(existing_match, updated_match)

    async def apply_match_updates(self, existing_match: Match, updated_match: Match):
        changes = []
        if existing_match.match_date != updated_match.match_date:
            changes.append(f"match_date: {existing_match.match_date} -> {updated_match.match_date}")
        if existing_match.set != updated_match.set:
            changes.append(f"set: {existing_match.set} -> {updated_match.set}")
        if changes:
            await update_match(self.session, updated_match, changes)

    def prepare_updated_match(self, existing_match: Match, match_datetime: datetime, set: str) -> Match:
        updated_match = replace(existing_match)
        updated_match.match_date = match_datetime
        if set != "0-0":
            updated_match.set = set
            if '3' in set:
                updated_match.status = MatchStatus.FINISHED
        return updated_match

    async def extract_main_id(self, soup: BeautifulSoup) -> Optional[str]:
        span = soup.find("span", id=re.compile(r"Content_Main_(\d+)_userControl_lbl_title"))
        if span:
            match = re.search(r"Content_Main_(\d+)_userControl_lbl_title", span["id"])
            return match.group(1) if match else None
        return None

    async def add_match_live_code(self, url, pool_id, gender):
        html_content = await self.fetch(url)
        if not html_content:
            log_event(
                action="fetch_html_error",
                level="error",
                pool_id=pool_id,
                url=url,
                message="Erreur lors de la récupération de la page HTML pour les live codes."
            )
            return

        soup = BeautifulSoup(html_content, 'html.parser')
        main_id = await self.extract_main_id(soup)
        if not main_id:
            log_event(
                action="missing_main_id",
                level="error",
                pool_id=pool_id,
                message="Impossible de trouver l'identifiant principal."
            )
            return

        await self.process_all_days(soup, main_id, pool_id, gender)

    async def process_all_days(self, soup: BeautifulSoup, main_id: str, pool_id: int, gender: str):
        total_days = 0
        while True:
            day_block = soup.find(id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RPL_Leg")
            if not day_block:
                break
            await self.process_matches_in_day(soup, main_id, total_days, pool_id, gender)
            total_days += 2

    async def process_matches_in_day(self, soup: BeautifulSoup, main_id: str, total_days: int, pool_id: int, gender: str):
        match_count = 0
        while True:
            match_block = soup.find(id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RADLIST_Matches_ctrl{match_count}_RPL_Match")
            if not match_block:
                break
            await self.process_match_block(match_block, pool_id, gender)
            match_count += 2

    async def process_match_block(self, match_block, pool_id: int, gender: str):
        mID = self.extract_match_id(match_block)
        home_team_name, guest_team_name = self.extract_teams(match_block)
        home_team_full = get_full_team_name(home_team_name, gender)
        guest_team_full = get_full_team_name(guest_team_name, gender)

        if not home_team_full:
            log_event(
                action="missing_team_name",
                level="error",
                pool_id=pool_id,
                team_name=home_team_name,
                message="Nom d'équipe domicile non trouvé dans les alias."
            )
        if not guest_team_full:
            log_event(
                action="missing_team_name",
                level="error",
                pool_id=pool_id,
                team_name=guest_team_name,
                message="Nom d'équipe visiteur non trouvé dans les alias."
            )

        date_time = match_block.find("span", id=re.compile("LB_DataOra"))
        if date_time:
            match_date = date_time.get_text(strip=True)
            parsed_match_date = datetime.strptime(match_date, "%d/%m/%Y - %H:%M")

            if home_team_full and guest_team_full:
                await self.update_match_details(pool_id, home_team_full, guest_team_full, parsed_match_date, mID)

    def extract_match_id(self, match_block) -> str:
        onclick_attr = match_block.find("div", onclick=True)
        mID_match = re.search(r"mID=(\d+)", onclick_attr["onclick"]) if onclick_attr else None
        return mID_match.group(1) if mID_match else None

    def extract_teams(self, match_block) -> Tuple[str, str]:
        team_home = match_block.find("span", id=re.compile("Label2|Label6"))
        team_guest = match_block.find("span", id=re.compile("Label4|Label7"))
        home_team_name = team_home.get_text(strip=True) if team_home else None
        guest_team_name = team_guest.get_text(strip=True) if team_guest else None
        return home_team_name, guest_team_name

    async def update_match_details(self, pool_id: int, home_team_full: str, guest_team_full: str, match_date: datetime, mID: str):
        team_a = await get_team_by_pool_and_name(self.session, pool_id, home_team_full)
        team_b = await get_team_by_pool_and_name(self.session, pool_id, guest_team_full)

        if team_a and team_b:
            existing_match = await get_match_by_pool_teams_date(self.session, pool_id, team_a.id, team_b.id, match_date)
            if existing_match:
                updated_match = replace(existing_match)
                updated_match.live_code = int(mID)
                if existing_match.live_code != updated_match.live_code:
                    changes = [f"live_code: {existing_match.live_code} -> {updated_match.live_code}"]
                    log_event(
                        action="live_code_updated",
                        level="info",
                        match_code=existing_match.match_code,
                        changes=changes
                    )
                    await update_match(self.session, updated_match, changes)