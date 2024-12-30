import asyncio
from dataclasses import replace
from datetime import datetime
import re
from typing import Optional, Tuple
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

# API imports
from api.matches_api import get_active_matches_by_pool_id, get_match_by_pool_teams_date, update_match
from api.pools_api import get_pools_by_league_and_season
from api.teams_api import get_team_by_pool_and_name

# Models
from models.format import Format
from models.match import Match, MatchStatus
from models.pool import Pool, PoolDivisionCode
from models.scraper import Scraper

# Services
from services.pools_service import add_or_update_pool

# Utils
from utils.file_utils import create_output_directory, delete_output_directory
from utils.scraper_logic import handle_csv_download_and_parse
from utils.team_utils import get_full_team_name
from utils.utils import parse_season

# Logger
from config.logger_config import log_event, logger


class ProScraper(Scraper):
    def __init__(self, session):
        super().__init__(session, name="pro_scraper")
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

        # Cache pour stocker tous les matches qui ont subi des modifications
        # avant de n'appeler update_match qu'une seule fois par match.
        #
        # Clé = match.id, Valeur = (copie_modifiée_du_match, [liste_des_changements_str]).
        self._updated_matches_cache = {}

    async def run_scraping(self):
        if self.session is None:
            raise ValueError("La session aiohttp est non initialisée ou fermée.")

        tasks = []

        try:
            # Récupération des poules déjà existantes pour cette ligue/saison
            existing_pools = await get_pools_by_league_and_season(
                self.session, self.league_code, self.parsed_season
            )
            existing_pools_dict = {
                (pool.pool_code, pool.league_code, pool.season): pool
                for pool in existing_pools
            }

            # Boucle de traitement de chaque poule configurée
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
                    pool = Pool(**pool_data)

                    # Clé d'identification pour le dict
                    key = (pool.pool_code, pool.league_code, pool.season)
                    existing_pool = existing_pools_dict.get(key)

                    # Ajout/mise à jour de la poule en base
                    new_pool = await add_or_update_pool(self.session, pool, existing_pool)

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

            # Exécution en parallèle de toutes les tâches de scraping
            await asyncio.gather(*tasks)

            # IMPORTANT : Après avoir tout traité, on applique réellement les mises à jour
            # en base de données via un unique passage (une seule fois par match).
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
        # 1) Télécharge et parse un éventuel CSV (selon la logique existante)
        await handle_csv_download_and_parse(self.session, pool, season, folder)

        # 2) Parsing du XML et mise à jour des matches
        await self.parse_and_update_matches(lnv_xml_url, pool.id)

        # 3) Compléter avec le live_code
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

        # On récupère tous les matches actifs pour cette poule
        existing_matches = await get_active_matches_by_pool_id(self.session, pool_id)

        # Parcours de chaque noeud <Match> dans le XML
        for match in root.findall(".//Match"):
            await self.process_xml_match(match, existing_matches)

    async def process_xml_match(self, match, existing_matches: Optional[list[Match]]):
        code_match = match.find("CodeMatch").text

        # Récupération de la date/heure du match
        match_date = match.find("Date").text + " " + match.find("Heure").text
        match_datetime = datetime.strptime(match_date, "%d-%m-%Y %H:%M:%S")

        # Récupération du "set" (score total sous forme X-Y)
        set_value = match.find("Score").text

        # Score détaillé set par set
        score_details = []
        for i in range(1, 6):
            set_score = match.find(f"Set{i}").text
            if set_score and set_score != "0-0":
                score_details.append(set_score)
        score_str = ",".join(score_details)

        # On retrouve le match correspondant dans notre liste existante
        existing_match = next((m for m in existing_matches if m.match_code == code_match), None)
        if not existing_match:
            return  # Si le match n'existe pas en base, on ne fait rien.

        # On fabrique un clone pour y appliquer les mises à jour
        updated_match = replace(existing_match)
        updated_match.match_date = match_datetime

        # Si le set n'est pas 0-0 (pas joué), on met à jour
        if set_value != "0-0":
            updated_match.set = set_value
            # Si l'une des équipes a 3 dans le set (ex: 3-0, 3-1, 3-2), match terminé
            if '3' in set_value:
                updated_match.status = MatchStatus.FINISHED

        if score_str:
            updated_match.score = score_str

        # On programme la mise à jour dans le cache
        await self.apply_match_updates(existing_match, updated_match)

    async def apply_match_updates(self, existing_match: Match, updated_match: Match):
        """
        Compare l'existant et le nouvel objet pour déterminer
        les champs modifiés, et planifie la mise à jour dans le cache.
        """
        changes_dict = {}
        for field_name in ['match_date', 'set', 'score', 'status']:
            old_val = getattr(existing_match, field_name, None)
            new_val = getattr(updated_match, field_name, None)
            if old_val != new_val:
                changes_dict[field_name] = new_val

        if changes_dict:
            self.schedule_update_for_match(existing_match, **changes_dict)

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

        # Parcours de toutes les journées ("days") sur la page
        await self.process_all_days(soup, main_id, pool_id, gender)

    async def extract_main_id(self, soup: BeautifulSoup) -> Optional[str]:
        # Cherche un span du type id="Content_Main_XX_userControl_lbl_title"
        span = soup.find("span", id=re.compile(r"Content_Main_(\d+)_userControl_lbl_title"))
        if span:
            match_obj = re.search(r"Content_Main_(\d+)_userControl_lbl_title", span["id"])
            return match_obj.group(1) if match_obj else None
        return None

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
            match_block = soup.find(
                id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RADLIST_Matches_ctrl{match_count}_RPL_Match"
            )
            if not match_block:
                break

            await self.process_match_block(match_block, pool_id, gender)
            match_count += 2

    async def process_match_block(self, match_block, pool_id: int, gender: str):
        # Récupération du live code (mID=XXX)
        mID = self.extract_match_id(match_block)

        # Extraction des équipes domicile/extérieur
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
            match_date_text = date_time.get_text(strip=True)
            parsed_match_date = datetime.strptime(match_date_text, "%d/%m/%Y - %H:%M")

            # Récupération des équipes depuis la BDD pour retrouver le match
            if home_team_full and guest_team_full:
                team_a = await get_team_by_pool_and_name(self.session, pool_id, home_team_full)
                team_b = await get_team_by_pool_and_name(self.session, pool_id, guest_team_full)

                if team_a and team_b:
                    # On essaie de retrouver le match correspondant
                    existing_match = await get_match_by_pool_teams_date(
                        self.session, pool_id, team_a.id, team_b.id, parsed_match_date
                    )

                    if existing_match and mID:
                        # On fait une copie pour modifier le live_code
                        updated_match = replace(existing_match)
                        updated_match.live_code = int(mID)

                        # Si on a un changement, on le planifie
                        if existing_match.live_code != updated_match.live_code:
                            self.schedule_update_for_match(existing_match, live_code=updated_match.live_code)

    def extract_match_id(self, match_block) -> Optional[str]:
        onclick_attr = match_block.find("div", onclick=True)
        if onclick_attr:
            mID_match = re.search(r"mID=(\d+)", onclick_attr["onclick"])
            return mID_match.group(1) if mID_match else None
        return None

    def extract_teams(self, match_block) -> Tuple[Optional[str], Optional[str]]:
        # L'id des spans qui contiennent le nom des équipes peuvent varier...
        team_home = match_block.find("span", id=re.compile("Label2|Label6"))
        team_guest = match_block.find("span", id=re.compile("Label4|Label7"))

        home_team_name = team_home.get_text(strip=True) if team_home else None
        guest_team_name = team_guest.get_text(strip=True) if team_guest else None
        return home_team_name, guest_team_name

    # --------------------------------------------------------------------------
    #                 Gestion du cache et finalisation des updates
    # --------------------------------------------------------------------------

    def schedule_update_for_match(self, existing_match: Match, **new_fields):
        """
        Prépare les changements pour un match existant, sans faire
        immédiatement l'update en base.
        """
        if not existing_match.id:
            return  # Par prudence, si match.id n'existe pas, on ne peut pas gérer un cache.

        # Récupère le match cloné et la liste de modifications du cache s'il existe déjà,
        # sinon on initialise.
        if existing_match.id not in self._updated_matches_cache:
            self._updated_matches_cache[existing_match.id] = (replace(existing_match), [])

        updated_match, changes_list = self._updated_matches_cache[existing_match.id]

        # Applique les nouveaux champs
        for field_name, new_value in new_fields.items():
            old_value = getattr(updated_match, field_name, None)
            if old_value != new_value:
                setattr(updated_match, field_name, new_value)
                changes_list.append(f"{field_name}: {old_value} -> {new_value}")

    async def finalize_updates(self):
        """
        Parcourt tous les matches en cache et applique réellement les
        modifications (appel en base de données via update_match).
        """
        for match_id, (updated_match, changes_list) in self._updated_matches_cache.items():
            if changes_list:  # seulement si on a de vrais changements
                await update_match(self.session, updated_match, changes_list)

        # Après finalisation, on peut vider le cache
        self._updated_matches_cache.clear()