import asyncio
import re
from bs4 import BeautifulSoup
from api.competitions_api import bulk_deactivate_pools
from api.config_api import create_raw_division_mapping, get_raw_division_mappings_by_league_and_season
from api.pools_api import get_pools_by_league_and_season
from models.pool import Pool
from models.raw_division_mapping import RawDivisionMapping
from models.scraper import Scraper
from utils.scraper_logic import handle_csv_download_and_parse
from config.logger_config import log_event
from utils.utils import capitalize_words

class RegionalScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session, 
            name="regional_scraper", 
            url="http://www.ffvb.org/120-37-1-Championnats-Regionaux", 
            priority_validation_enabled=False,
        )

    async def run_scraping(self):
        """
        Logique principale du scraping pour les pools régionales.
        """
        try:
            html_content = await self.fetch(self.url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    scope="regional_pools",
                    url=self.url,
                    message="Échec de la récupération du contenu HTML pour les pools régionales."
                )
                return

            soup = BeautifulSoup(html_content, 'html.parser')
            league_tables = soup.find_all("table", class_=["tableau_bleu", "tableau_rouge", "tableau_violet"])
            tasks = []

            for table in league_tables:
                try:
                    league_name_tag = table.find('td', style="text-align: center;")
                    if not league_name_tag:
                        continue

                    league_name = capitalize_words(league_name_tag.get_text(strip=True))

                    # On cherche un lien contenant 'codent='
                    a_tag = table.find('a', href=lambda href: href and 'codent=' in href)
                    if a_tag:
                        league_code_match = re.search(r'codent=([^&]+)', a_tag['href'])
                        if not league_code_match:
                            log_event(
                                action="missing_league_code",
                                level="warning",
                                scope="regional_pools",
                                url=a_tag['href']
                            )
                            continue

                        league_code = league_code_match.group(1)
                        league_page_url = a_tag['href']

                        # On lance la tâche de scraping des poules pour cette ligue
                        if league_code not in ['LIMY', 'LIGY', 'LIGU', 'LIMART', 'LIRE']:
                            task = self.scrape_pools_from_league(league_code, league_name, league_page_url)
                            tasks.append(task)

                except Exception as e:
                    log_event(
                        action="league_processing_error",
                        level="error",
                        scope="regional_pools",
                        error=str(e),
                        message="Erreur lors du traitement d'une ligue régionale."
                    )

            # On exécute toutes les tâches (une par ligue)
            await asyncio.gather(*tasks)
            
            # Finalisation : on applique toutes les modifications pour les matchs
            await self.finalize_matches_updates()
            
            # Finalisation : on applique toutes les modifications pour les associations
            await self.finalize_associations_updates()

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                scope="regional_pools",
                error=str(e),
                message="Erreur critique lors du scraping des poules régionales."
            )

    async def scrape_pools_from_league(self, league_code: str, league_name: str, league_page_url: str):
        try:
            league_page_url = league_page_url.replace('https://', 'http://')
            html_content = await self.fetch(league_page_url)
            if not html_content:
                log_event(action="fetch_html_error", level="error", league_name=league_name, league_code=league_code)
                return

            soup = BeautifulSoup(html_content, 'html.parser')
            pool_links = soup.select('ul#menu > li > ul > li > ul > li > a[href*="poule="]')
            
            raw_season = None
            for a_tag in pool_links:
                season_match = re.search(r'saison=([^&]+)', a_tag['href'])
                if season_match:
                    raw_season = season_match.group(1)
                    break
            if not raw_season:
                raise ValueError("Saison non trouvée")

            existing_pools = await get_pools_by_league_and_season(self.session, league_code, raw_season)
            existing_pools_dict = {(p.pool_code, p.league_code, p.season): p for p in existing_pools}

            raw_mappings = await get_raw_division_mappings_by_league_and_season(self.session, league_code, raw_season)
            mapping_dict = {m.raw_division_name: m for m in raw_mappings}

            scraped_pool_ids = set()
            tasks = []

            for a_tag in pool_links:
                try:
                    href = a_tag['href']
                    pool_code_match = re.search(r'poule=([^&]+)', href)
                    if not pool_code_match:
                        continue

                    pool_code = pool_code_match.group(1)
                    name = a_tag.get_text(strip=True)
                    raw_division_tag = a_tag.find_parent('ul').find_previous_sibling('a')
                    raw_division_name = raw_division_tag.get_text(strip=True) if raw_division_tag else ""

                    mapping = mapping_dict.get(raw_division_name)

                    # Enregistre un nouveau mapping vide en base si aucun n'existe pour standardiser la pool
                    if not mapping:
                        new_mapping = RawDivisionMapping(
                            raw_division_name=raw_division_name,
                            league_code=league_code,
                            season=raw_season
                        )
                        created_mapping = await create_raw_division_mapping(self.session, new_mapping)
                        mapping_dict[raw_division_name] = created_mapping
                        continue
                    
                    if raw_division_name == "MOINS 13 ANS FÉMININES OCCITANIE EST":
                        print("-------- is mapped:", mapping.is_mapped())

                    if not mapping.is_mapped():
                        continue
                    
                    pool_obj = Pool(
                        pool_code=pool_code,
                        league_code=league_code,
                        season=raw_season,
                        league_name=league_name,
                        name=name,
                        division_id=mapping.division_id,
                        format=mapping.format,
                        gender=mapping.gender,
                    )
                    
                    key = (pool_obj.pool_code, pool_obj.league_code, pool_obj.season)
                    existing_pool = existing_pools_dict.get(key)

                    task = handle_csv_download_and_parse(
                        self,
                        pool_obj,
                        raw_season,
                        existing_pool=existing_pool,
                        scraped_pool_ids=scraped_pool_ids,
                    )
                    tasks.append(task)

                except Exception as e:
                    log_event(action="pool_processing_error", level="error", error=str(e))

            await asyncio.gather(*tasks)

            missing_pool_ids = {
                pool.id for pool in existing_pools
                if pool.active and pool.id not in scraped_pool_ids
            }
            if league_code == "LILR":
                print("-----------missing_pool_ids", missing_pool_ids)
            if missing_pool_ids:
                await bulk_deactivate_pools(self.session, missing_pool_ids)

        except Exception as e:
            log_event(action="critical_league_error", level="error", error=str(e))