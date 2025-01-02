import asyncio
import time  # <-- Ajout de ce module
from dataclasses import replace
from datetime import datetime
import re
from typing import Optional, Tuple
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from api.matches_api import (
    get_active_matches_by_pool_id,
    get_match_by_pool_teams_date
)
from api.pools_api import get_pools_by_league_and_season
from api.teams_api import get_team_by_pool_and_name
from models.datasource_priority import DataSourcePriority
from models.format import Format
from models.match import Match, MatchStatus
from models.pool import Pool, PoolDivisionCode
from models.scraper import Scraper
from services.pools_service import add_or_update_pool
from utils.file_utils import create_output_directory, delete_output_directory
from utils.scraper_logic import handle_csv_download_and_parse
from utils.team_utils import get_full_team_name
from utils.utils import parse_season
from config.logger_config import log_event


class ProScraper(Scraper):
    def __init__(self, session):
        super().__init__(session, name="pro_scraper", priority_validation_enabled=True)
        self.folder = create_output_directory("Pro")
        self.raw_season = "2024/2025"
        self.parsed_season = parse_season(self.raw_season)
        self.league_code = "AALNV"
        self.league_name = "PRO"

        # Définition des poules à traiter
        self.pools_json = [
            {
                "code": "MSL",
                "pool_name": "Marmara SpikeLigue",
                "division_name": "Marmara SpikeLigue",
                "gender": "M",
                "lnv_url": "http://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=115",
                "lnv_xml_url": "https://www.lnv.fr/xml/calendrier-LAM.xml"
            },
            {
                "code": "LBM",
                "pool_name": "Ligue B Masculine",
                "division_name": "Ligue B Masculine",
                "gender": "M",
                "lnv_url": "http://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=116",
                "lnv_xml_url": "https://www.lnv.fr/xml/calendrier-LBM.xml"
            },
            {
                "code": "LAF",
                "pool_name": "Saforelle Power 6",
                "division_name": "Saforelle Power 6",
                "gender": "F",
                "lnv_url": "http://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=113",
                "lnv_xml_url": "https://www.lnv.fr/xml/calendrier-LAF.xml"
            },
        ]

    async def run_scraping(self):
        if self.session is None:
            raise ValueError("La session aiohttp est non initialisée ou fermée.")

        tasks = []

        try:
            # 1) Récupération des poules déjà existantes pour cette ligue/saison
            existing_pools = await get_pools_by_league_and_season(
                self.session, self.league_code, self.parsed_season
            )
            existing_pools_dict = {
                (pool.pool_code, pool.league_code, pool.season): pool
                for pool in existing_pools
            }

            # 2) Boucle de traitement de chaque poule configurée
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
                        "format": Format.SIX.value,
                        "gender": pool_json['gender']
                    }
                    pool_obj = Pool(**pool_data)

                    # Clé d'identification pour le dict
                    key = (pool_obj.pool_code, pool_obj.league_code, pool_obj.season)
                    existing_pool = existing_pools_dict.get(key)

                    # Ajout/mise à jour de la poule en base
                    new_pool = await add_or_update_pool(self.session, pool_obj, existing_pool)

                    # Si la poule est créée ou mise à jour, on lance la chaîne de tâches
                    if new_pool:
                        tasks.append(self.execute_task_chain(
                            new_pool,
                            self.raw_season,
                            self.folder,
                            pool_json['lnv_url'],
                            pool_json['lnv_xml_url']
                        ))
                except Exception as e:
                    log_event(
                        action="pool_processing_error",
                        level="error",
                        pool_name=pool_json['pool_name'],
                        error=str(e)
                    )

            # 3) Exécution en parallèle de toutes les tâches de scraping
            await asyncio.gather(*tasks)

            # 4) IMPORTANT : Après tout, on applique réellement les mises à jour / créations en base
            await self.finalize_updates()

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
        # 1) Télécharge et parse un éventuel CSV (FFVB)
        await handle_csv_download_and_parse(self.session, self, pool, season, folder)

        # 2) Parsing du XML LNV
        await self.parse_and_update_matches(lnv_xml_url, pool.id)

        # 3) Compléter avec le live_code (HTML LNV)
        await self.add_match_live_code(lnv_url, pool.id, pool.gender)

    # --------------------------------------------------------------------------
    #  Parsing XML (LNV)
    # --------------------------------------------------------------------------
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
        # On récupère tous les matches actifs pour cette poule
        existing_matches = await get_active_matches_by_pool_id(self.session, pool_id)
        existing_matches_dict = {(m.league_code, m.match_code): m for m in existing_matches}

        # Parcours de chaque noeud <Match> dans le XML
        for match_el in root.findall(".//Match"):
            await self.process_xml_match(match_el, pool_id, existing_matches_dict)

    async def process_xml_match(self, match_el, pool_id: int, existing_matches_dict: dict):
        code_match = match_el.find("CodeMatch").text
        if not code_match:
            return

        match_key = (self.league_code, code_match)

        # Récupération de la date/heure
        date_str = match_el.find("Date").text or "01-01-1970"
        heure_str = match_el.find("Heure").text or "00:00:00"
        match_datetime = datetime.strptime(f"{date_str} {heure_str}", "%d-%m-%Y %H:%M:%S")

        # Récupération du set global
        set_value = match_el.find("Score").text or "0-0"

        # Récupération du score détaillé
        score_details = []
        for i in range(1, 6):
            set_score = match_el.find(f"Set{i}").text
            if set_score and set_score != "0-0":
                score_details.append(set_score)
        score_str = ",".join(score_details)

        existing_match = existing_matches_dict.get(match_key)

        # On construit un "new_match" (ou un updated clone) pour la fusion
        if existing_match:
            updated_match = replace(existing_match)
        else:
            # Si aucun match n'existe, on crée un nouvel objet
            updated_match = Match(
                match_code=code_match,
                league_code=self.league_code,
                pool_id=pool_id,
            )

        # On met à jour les champs
        updated_match.match_date = match_datetime
        if set_value != "0-0":
            updated_match.set = set_value
            if "3" in set_value:
                updated_match.status = MatchStatus.FINISHED
        if score_str:
            updated_match.score = score_str

        # On fusionne dans le cache
        self.schedule_match_changes(
            existing_match=existing_match,
            updated_match=updated_match,
            prefix="LNV-XML",
            priority=DataSourcePriority.LNV_XML
        )

    # --------------------------------------------------------------------------
    #  Parsing HTML LNV pour le live_code
    # --------------------------------------------------------------------------
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

        # Parcours de toutes les journées
        await self.process_all_days(soup, main_id, pool_id, gender)

    async def extract_main_id(self, soup: BeautifulSoup) -> Optional[str]:
        span = soup.find("span", id=re.compile(r"Content_Main_(\d+)_userControl_lbl_title"))
        if span:
            match_ = re.search(r"Content_Main_(\d+)_userControl_lbl_title", span["id"])
            return match_.group(1) if match_ else None
        return None

    async def process_all_days(self, soup: BeautifulSoup, main_id: str, pool_id: int, gender: str):
        total_days = 0
        tasks = []  # Liste de tasks asynchrones
        
        while True:
            day_block = soup.find(
                id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RPL_Leg"
            )
            if not day_block:
                break
            
            # Au lieu d'appeler directement, on crée un task
            task = asyncio.create_task(self.process_matches_in_day(soup, main_id, total_days, pool_id, gender))
            tasks.append(task)
            total_days += 2
        
        # Une fois tous les match_block de cette journée récupérés, on exécute en parallèle
        await asyncio.gather(*tasks)

    async def process_matches_in_day(self, soup: BeautifulSoup, main_id: str, total_days: int, pool_id: int, gender: str):
        async with asyncio.Semaphore(5):
            match_count = 0
            while True:
                match_block = soup.find(
                    id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RADLIST_Matches_ctrl{match_count}_RPL_Match"
                )
                if not match_block:
                    break

                # Au lieu d'appeler directement, on crée un task
                await self.process_match_block(match_block, pool_id, gender)
                match_count += 2


    async def process_match_block(self, match_block, pool_id: int, gender: str):
        # Récupération du live code (mID=XXX)
        mID = self.extract_match_id(match_block)

        # Équipes
        home_team_name, guest_team_name = self.extract_teams(match_block)
        home_team_full = get_full_team_name(home_team_name, gender)
        guest_team_full = get_full_team_name(guest_team_name, gender)

        # Log si alias non trouvé
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

        # Date
        date_time = match_block.find("span", id=re.compile("LB_DataOra"))
        if date_time:
            match_date_text = date_time.get_text(strip=True)
            parsed_match_date = datetime.strptime(match_date_text, "%d/%m/%Y - %H:%M").date()
            # Récupération en base des teams si possible
            if home_team_full and guest_team_full:
                team_a = await get_team_by_pool_and_name(self.session, pool_id, home_team_full)
                team_b = await get_team_by_pool_and_name(self.session, pool_id, guest_team_full)

                # Si on a bien nos deux équipes
                if team_a and team_b and mID:
                    # On essaie de retrouver le match
                    existing_match = await get_match_by_pool_teams_date(
                        self.session, pool_id, team_a.id, team_b.id, parsed_match_date
                    )

                    if existing_match:
                        # On prépare un clone pour le live_code
                        updated_match = replace(existing_match)
                        updated_match.live_code = int(mID)
                        self.schedule_match_changes(
                            existing_match=existing_match, 
                            updated_match=updated_match, 
                            prefix="LNV-Live", 
                            priority=DataSourcePriority.LNV_HTML
                        )

    def extract_match_id(self, match_block) -> Optional[str]:
        onclick_attr = match_block.find("div", onclick=True)
        if onclick_attr:
            mID_match = re.search(r"mID=(\d+)", onclick_attr["onclick"])
            return mID_match.group(1) if mID_match else None
        return None

    def extract_teams(self, match_block) -> Tuple[Optional[str], Optional[str]]:
        team_home = match_block.find("span", id=re.compile("Label2|Label6"))
        team_guest = match_block.find("span", id=re.compile("Label4|Label7"))

        home_team_name = team_home.get_text(strip=True) if team_home else None
        guest_team_name = team_guest.get_text(strip=True) if team_guest else None
        return home_team_name, guest_team_name