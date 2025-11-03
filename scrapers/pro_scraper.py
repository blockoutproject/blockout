import asyncio
from dataclasses import replace
from datetime import datetime
import re
from typing import Optional, Tuple
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from api.config_api import create_raw_division_mapping, get_raw_division_mappings_by_league_and_season
from api.pools_api import get_pools_by_league_and_season
from models.enums.datasource_priority import DataSourcePriority
from models.enums.format import Format
from models.enums.gender import Gender
from models.enums.match_status import MatchStatus
from models.pool import Pool
from models.raw_division_mapping import RawDivisionMapping
from models.scraper import Scraper
from services.matchs_service import find_match_in_cache
from services.teams_service import find_team_by_name_in_division_format_gender_season
from utils.logging_utils import to_loggable
from utils.match_utils import validate_set_format, validate_set_score_format
from utils.scraper_logic import handle_csv_download_and_parse
from utils.team_utils import get_full_name
from config.logger_config import log_event

class ProScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session, name="pro_scraper", 
            priority_validation_enabled=True
        )
        self.raw_season = "2025/2026"
        self.league_code = "AALNV"
        self.league_name = "Pro"

        # Définition des poules à traiter
        self.pools_json = [
            {
                "pool_code": "MSL",
                "name": "Marmara SpikeLigue",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAM.xml"
            },
            {
                "pool_code": "LBM",
                "name": "Ligue B Masculine",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=126",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LBM.xml",
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LBM.xml"
            },
            {
                "pool_code": "SPS",
                "name": "Saforelle Power 6",
                "lnv_url": "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=124",
                "lnv_xml_matches_url": "https://www.lnv.fr/xml/calendrier-LAF.xml",                
                "lnv_xml_rank_url": "https://www.lnv.fr/xml/classement-LAF.xml"
            },
        ]

    async def run_scraping(self):
        if self.session is None:
            raise ValueError("La session aiohttp est non initialisée ou fermée.")

        tasks = []

        try:
            # Récupération des poules déjà existantes pour cette ligue/saison
            existing_pools = await get_pools_by_league_and_season(self.session, self.league_code, self.raw_season)
            existing_pools_dict = {
                (pool.pool_code, pool.league_code, pool.season): pool
                for pool in existing_pools
            }
            
            raw_mappings = await get_raw_division_mappings_by_league_and_season(self.session, self.league_code, self.raw_season)
            mapping_dict = {m.raw_division_name: m for m in raw_mappings}

            # Boucle de traitement de chaque poule configurée
            for pool_json in self.pools_json:
                try:
                    name = pool_json['name']
                    pool_code = pool_json['pool_code']
                    mapping = mapping_dict.get(name)

                    if not mapping:
                        new_mapping = RawDivisionMapping(
                            raw_division_name=name,
                            league_code=self.league_code,
                            season=self.raw_season
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
                        gender=mapping.gender
                    )

                    # Clé d'identification pour le dict
                    key = (pool_obj.pool_code, pool_obj.league_code, pool_obj.season)
                    existing_pool = existing_pools_dict.get(key)

                    # Si la poule est créée ou mise à jour, on lance la chaîne de tâches
                    tasks.append(self.execute_task_chain(
                        pool_obj,
                        existing_pool,
                        self.raw_season,
                        pool_json['lnv_url'],
                        pool_json['lnv_xml_matches_url'],
                        pool_json['lnv_xml_rank_url']
                    ))
                except Exception as e:
                    log_event(
                        action="pool_processing_error",
                        level="error",
                        name=pool_json['name'],
                        error=str(e)
                    )

            # Exécution en parallèle de toutes les tâches de scraping
            await asyncio.gather(*tasks)

            # Finalisation : on applique toutes les modifications pour les matchs
            await self.finalize_matches_updates()
            
            # Finalisation : on applique toutes les modifications pour les associations
            await self.finalize_associations_updates()

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                error=str(e),
                message="Erreur critique lors du scraping des poules professionnelles."
            )

    async def execute_task_chain(self, pool: Pool, existing_pool: Pool, raw_season: str, lnv_url, lnv_xml_matches_url, lnv_xml_rank_url):
        try:
            # 1) Télécharge et parse un éventuel CSV (FFVB)
            await handle_csv_download_and_parse(self, pool, raw_season, existing_pool=existing_pool)

            # 2) Parsing du XML LNV
            await self.parse_and_update_matches(lnv_xml_matches_url, lnv_xml_rank_url, pool)

            # 3) Compléter avec le live_code (HTML LNV)
            await self.add_match_live_code(lnv_url, pool)
        except Exception as e:
            log_event(
                action="task_chain_error",
                level="error",
                pool_code=pool.pool_code,
                error=str(e),
                message="Erreur lors de l'exécution de la chaîne de tâches pour une poule."
            )

    # --------------------------------------------------------------------------
    #  Parsing XML (LNV)
    # --------------------------------------------------------------------------
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
                    message="Erreur lors de la récupération du flux XML pour les matchs."
                )
                return

            if not xml_rank_content:
                log_event(
                    action="fetch_xml_rank_error",
                    level="error",
                    pool_id=pool.id,
                    url=lnv_xml_rank_url,
                    message="Erreur lors de la récupération du flux XML pour le classement."
                )
                return

            # 1) Parser les matchs
            matches_root = ET.fromstring(xml_matches_content)
            await self.process_xml_matches(matches_root, pool.id)

            # 2) Parser le classement
            rank_root = ET.fromstring(xml_rank_content)
            await self.process_xml_rank(rank_root, pool)
        except Exception as e:
            log_event(
                action="parse_and_update_matches_error",
                level="error",
                pool_id=pool.id,
                message=str(e)
            )

    async def process_xml_matches(self, matches_root: ET.Element, pool_id: int):
        try:
            for match_el in matches_root.findall(".//Match"):

                match_code = match_el.find("CodeMatch").text

                if not match_code:
                    return

                match_key = (self.league_code, match_code)

                date_str = match_el.find("Date").text or "01-01-1970"
                heure_str = match_el.find("Heure").text or "00:00:00"
                match_datetime = datetime.strptime(f"{date_str} {heure_str}", "%d-%m-%Y %H:%M:%S")
                
                set_value = validate_set_format(match_el.find("Score").text)
                
                score_details = []
                for i in range(1, 6):
                    set_score = validate_set_score_format(match_el.find(f"Set{i}").text)
                    if set_score and set_score != "0-0":
                        score_details.append(set_score)
                score_str = ",".join(score_details)

                # 1) Lire le match existant dans le cache
                cache_entry = self._matches_cache.get(match_key)

                if cache_entry:
                    # Déjà présent, on récupère l'existant (deuxième param car on recup les modif du scraping ffvb)
                    _, updated_obj, _, _ = cache_entry
                    existing_match = updated_obj
                else:
                    existing_match = None
                                
                # 2) Construire l'updated_match
                if existing_match:
                    updated_match = replace(existing_match)
                else:
                    # TODO :
                    # Nouveau match "incomplet"
                    # Remplir le strict nécessaire
                    continue

                log_event(
                    action="process_xml_match",
                    level="info",
                    pool_id=pool_id,
                    match_code=match_code,
                    match_date=match_datetime.isoformat(),
                    set_value=set_value,
                    score_str=score_str,
                    updated_match=to_loggable(updated_match)
                )

                # 3) Mettre à jour les champs
                updated_match.match_date = match_datetime
                if set_value and set_value != "0-0":
                    updated_match.set = set_value
                    if "3" in set_value:
                        updated_match.status = MatchStatus.FINISHED.value
                        
                if score_str:
                    updated_match.score = score_str

                # 4) Fusion dans le cache
                self.schedule_match_changes(
                    updated_match=updated_match,
                    prefix="LNV-XML",
                    priority=DataSourcePriority.LNV_XML
                )
        except Exception as e:
            log_event(
                action="process_xml_matches_error",
                level="error",
                pool_id=pool_id,
                message=str(e)
            )

    async def process_xml_rank(self, rank_root: ET.Element, pool: Pool):
        """
        Parse le XML de classement pour la poule `pool.id`, 
        et met à jour les stats dans `_associations_cache`.
        """
        try:
            # On parcourt chaque <Equipe> dans le <Competition> (ou directement si c’est le root)
            for competition_el in rank_root.findall(".//Competition"):
                # (Optionnel) vérifier CodeCompetition si nécessaire
                # code_compet = competition_el.attrib.get("CodeCompetition")

                for equipe_el in competition_el.findall(".//Equipe"):
                    nom_club = equipe_el.get("NomClub", "")  # <Equipe NomClub="Tours">
                    num_club = equipe_el.get("NumClub", "")  # <Equipe NumClub="572"> peut êtere utile pour identifier l'équipe plus tard

                    # Récupération des stats
                    rang_str = equipe_el.findtext("Rang", default="0")
                    points_str = equipe_el.findtext("Points", default="0")
                    mj_str = equipe_el.findtext("MatchsJoues", default="0")
                    mg_str = equipe_el.findtext("MatchsGagnes", default="0")
                    mp_str = equipe_el.findtext("MatchsPerdus", default="0")

                    # Convertir en int
                    rang = int(rang_str)
                    points = int(points_str)
                    mj = int(mj_str)
                    mg = int(mg_str)
                    mp = int(mp_str)

                    # Récupère le nom complet de l'équipe (via ton mapping JSON)
                    full_name = get_full_name(nom_club, pool.gender)
                    if not full_name:
                        # Si on n’a pas trouvé d’alias, on peut décider de skip ou de logguer un warning
                        continue

                    team = await find_team_by_name_in_division_format_gender_season(
                        self.session,
                        pool.division_id,
                        pool.format,
                        pool.gender,
                        pool.season,
                        full_name
                    )

                    if not team:
                        # Si on ne trouve pas l'équipe dans la base, log et skip
                        log_event(
                            action="team_not_found",
                            level="error",
                            pool_id=pool.id,
                            name=full_name,
                            message="Aucune équipe trouvée pour ce nom."
                        )
                        continue

                    # On met à jour l'association (pool_id, team_id).
                    self.schedule_association_replace(
                        pool_id=pool.id,
                        team_id=team.id,
                        points=points,
                    )
        except Exception as e:
            log_event(
                action="process_xml_rank_error",
                level="error",
                pool_id=pool.id,
                message=str(e)
            )
                    
    # --------------------------------------------------------------------------
    #  Parsing HTML LNV pour le live_code
    # --------------------------------------------------------------------------
    async def add_match_live_code(self, url, pool: Pool):
        html_content = await self.fetch(url)
        if not html_content:
            log_event(
                action="fetch_html_error",
                level="error",
                pool_id=pool.id,
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
                pool_id=pool.id,
                message="Impossible de trouver l'identifiant principal."
            )
            return

        # Parcours de toutes les journées
        await self.process_all_days(soup, main_id, pool)

    async def extract_main_id(self, soup: BeautifulSoup) -> Optional[str]:
        span = soup.find("span", id=re.compile(r"Content_Main_(\d+)_userControl_lbl_title"))
        if span:
            match_ = re.search(r"Content_Main_(\d+)_userControl_lbl_title", span["id"])
            return match_.group(1) if match_ else None
        return None

    async def process_all_days(self, soup: BeautifulSoup, main_id: str, pool: Pool):
        total_days = 0
        
        while True:
            day_block = soup.find(
                id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RPL_Leg"
            )
            if not day_block:
                break
            
            # Au lieu d'appeler directement, on crée un task
            await self.process_matches_in_day(soup, main_id, total_days, pool)
            total_days += 2

    async def process_matches_in_day(self, soup: BeautifulSoup, main_id: str, total_days: int, pool: Pool):
        match_count = 0
        coros = []  # Liste de tasks asynchrones

        while True:
            match_block = soup.find(
                id=f"ctl00_Content_Main_{main_id}_userControl_RADLIST_Legs_ctrl{total_days}_RADLIST_Matches_ctrl{match_count}_RPL_Match"
            )
            if not match_block:
                break

            # Au lieu d'appeler directement, on crée une coroutine
            coros.append(self.process_match_block(match_block, pool))

            match_count += 2

        # Une fois tous les match_block de cette journée récupérés, on exécute en parallèle
        await asyncio.gather(*coros)

    async def process_match_block(self, match_block, pool: Pool):
        # Récupération du live code (mID=XXX)
        mID = self.extract_match_id(match_block)

        # Équipes
        home_name, guest_name = self.extract_teams(match_block)
        home_team_full = get_full_name(home_name, pool.gender)
        guest_team_full = get_full_name(guest_name, pool.gender)

        # Log si alias non trouvé
        if not home_team_full:
            log_event(
                action="missing_name",
                level="error",
                pool_id=pool.id,
                raw_name=home_name,
                message="Nom d'équipe domicile non trouvé dans les alias."
            )
        if not guest_team_full:
            log_event(
                action="missing_name",
                level="error",
                pool_id=pool.id,
                raw_name=guest_name,
                message="Nom d'équipe visiteur non trouvé dans les alias."
            )

        # Date
        date_time = match_block.find("span", id=re.compile("LB_DataOra"))
        if date_time:
            match_date_text = date_time.get_text(strip=True)
            parsed_match_date = datetime.strptime(match_date_text, "%d/%m/%Y - %H:%M").date()
            # Récupération en base des teams si possible
            if home_team_full and guest_team_full:
                team_a = await find_team_by_name_in_division_format_gender_season(
                    self.session,
                    pool.division_id,
                    pool.format,
                    pool.gender,
                    pool.season,
                    home_team_full
                )
                team_b = await find_team_by_name_in_division_format_gender_season(
                    self.session,
                    pool.division_id,
                    pool.format,
                    pool.gender,
                    pool.season,
                    guest_team_full
                )

                # Si on a bien nos deux équipes
                if team_a and team_b and mID:
                    # On essaie de retrouver le match
                    existing_match = find_match_in_cache(
                        self, pool.id, team_a.id, team_b.id, parsed_match_date
                    )

                    if existing_match:
                        # On prépare un clone pour le live_code
                        updated_match = replace(existing_match)
                        updated_match.live_code = int(mID)
                        self.schedule_match_changes(
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

        home_name = team_home.get_text(strip=True) if team_home else None
        guest_name = team_guest.get_text(strip=True) if team_guest else None
        return home_name, guest_name