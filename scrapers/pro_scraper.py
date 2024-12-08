import asyncio
from dataclasses import replace
from datetime import datetime
from typing import Optional
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
from config.logger_config import log_event


class ProScraper(Scraper):
    def __init__(self, session):
        super().__init__(session)
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
        """
        Logique principale du scraping pour les poules professionnelles.
        Cette méthode sera automatiquement chronométrée et loguée.
        """
        tasks = []
        log_event(action="start_scraping", level="debug", scope="professional_pools")

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
                        log_event(
                            action="pool_processed",
                            level="debug",
                            pool_code=new_pool.pool_code,
                            pool_id=new_pool.id,
                            status="processed"
                        )
                        tasks.append(self.execute_task_chain(
                            new_pool.id, new_pool.pool_code, self.raw_season,
                            new_pool.gender, self.folder, pool_json['lnv_url'], pool_json['lnv_xml_url']
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
                scope="professional_pools",
                error=str(e),
                message="Erreur critique lors du scraping des poules professionnelles."
            )
        finally:
            delete_output_directory(self.folder)
            log_event(action="end_scraping", level="debug", scope="professional_pools")

    async def execute_task_chain(self, pool_id, pool_code, season, gender, folder, lnv_url, lnv_xml_url):
        """
        Exécute la chaîne de tâches pour une pool, incluant le téléchargement CSV,
        la mise à jour des matchs à partir du XML, et l'ajout des live codes.
        """
        await handle_csv_download_and_parse(self.session, pool_id, self.league_code, pool_code, season, folder)
        await self.parse_and_update_matches(lnv_xml_url, pool_id)
        await self.add_match_live_code(lnv_url, pool_id, gender)

    async def parse_and_update_matches(self, xml_url, pool_id):
        """
        Récupère les matchs depuis un flux XML et met à jour la base de données.
        """
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
        """
        Met à jour un match existant à partir des données XML.
        """
        code_match = match.find("CodeMatch").text
        match_date = match.find("Date").text + " " + match.find("Heure").text
        set = match.find("Score").text

        match_datetime = datetime.strptime(match_date, "%d-%m-%Y %H:%M:%S")
        existing_match = next((m for m in existing_matches if m.match_code == code_match), None)

        if existing_match:
            updated_match = self.prepare_updated_match(existing_match, match_datetime, set)
            await self.apply_match_updates(existing_match, updated_match)

    async def apply_match_updates(self, existing_match: Match, updated_match: Match):
        """
        Applique les mises à jour aux données d'un match si des modifications sont détectées.
        """
        changes = []
        if existing_match.match_date != updated_match.match_date:
            changes.append(f"match_date: {existing_match.match_date} -> {updated_match.match_date}")
        if existing_match.set != updated_match.set:
            changes.append(f"set: {existing_match.set} -> {updated_match.set}")
        if changes:
            log_event(
                action="match_updated",
                level="info",
                match_code=existing_match.match_code,
                changes=changes
            )
            await update_match(self.session, updated_match, changes)

    def prepare_updated_match(self, existing_match: Match, match_datetime: datetime, set: str) -> Match:
        """
        Prépare une nouvelle version du match avec les mises à jour nécessaires.
        """
        updated_match = replace(existing_match)
        updated_match.match_date = match_datetime
        if set != "0-0":
            updated_match.set = set
            if '3' in set:
                updated_match.status = MatchStatus.FINISHED
        return updated_match