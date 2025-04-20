import asyncio
import re
from bs4 import BeautifulSoup
from api.competitions_api import bulk_deactivate_pools
from api.pools_api import get_pools_by_league_and_season
from models.category import Category
from models.pool import Pool, PoolDivisionCode
from models.scraper import Scraper
from services.pools_service import add_or_update_pool
from utils.scraper_logic import handle_csv_download_and_parse
from utils.utils import parse_season, standardize_division_name
from config.logger_config import log_event

class RegionalScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session, 
            name="regional_scraper", 
            category=Category.REG, 
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

                    league_name = league_name_tag.get_text(strip=True)

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

    async def scrape_pools_from_league(self, league_code, league_name, league_page_url):
        """
        Récupère la liste des poules de la ligue, crée/MAJ chaque Pool,
        et lance le parsing CSV pour chacune.
        """
        try:
            league_page_url = league_page_url.replace('https://', 'http://')
            html_content = await self.fetch(league_page_url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    league_name=league_name,
                    league_code=league_code,
                    message="Échec de la récupération du contenu HTML pour la ligue."
                )
                return

            soup = BeautifulSoup(html_content, 'html.parser')
            pool_links = soup.select('ul#menu > li > ul > li > ul > li > a[href*="poule="]')
            tasks = []

            # On essaie de récupérer la saison depuis le premier lien
            raw_season = None
            for a_tag in pool_links:
                href = a_tag['href']
                season_match = re.search(r'saison=([^&]+)', href)
                if season_match:
                    raw_season = season_match.group(1)
                    break

            if not raw_season:
                log_event(
                    action="missing_season",
                    level="warning",
                    league_name=league_name,
                    league_code=league_code,
                    message="Aucune saison trouvée pour la ligue."
                )
                raise ValueError("Saison non trouvée.")

            parsed_season = parse_season(raw_season)
            existing_pools = await get_pools_by_league_and_season(self.session, league_code, parsed_season)
            existing_pools_dict = {
                (p.pool_code, p.league_code, p.season): p
                for p in existing_pools
            }
            
            # Set local pour gérer la désactivation par league
            scraped_pool_ids = set()
            
            # Parcours des poules
            for a_tag in pool_links:
                # Exclusion pour tester les desactivations
                if league_code in []:
                    continue
                try:
                    href = a_tag['href']
                    pool_code_match = re.search(r'poule=([^&]+)', href)
                    if not pool_code_match:
                        log_event(
                            action="missing_pool_code",
                            level="warning",
                            league_name=league_name,
                            league_code=league_code,
                            url=href
                        )
                        continue

                    pool_code = pool_code_match.group(1)
                    pool_name = a_tag.get_text(strip=True)

                    # On essaie de déterminer la division depuis les balises parents
                    raw_division_tag = a_tag.find_parent('ul').find_previous_sibling('a')
                    raw_division_name = raw_division_tag.get_text(strip=True) if raw_division_tag else ""

                    standardized = standardize_division_name(raw_division_name, PoolDivisionCode.REG, pool_code)

                    pool_data = {
                        "pool_code": pool_code,
                        "league_code": league_code,
                        "season": parsed_season,
                        "league_name": league_name,
                        "pool_name": pool_name,
                        "division_code": standardized["division_code"],
                        "division_name": standardized["division_name"],
                        "format": standardized["format"],
                        "gender": standardized["gender"],
                        "raw_division_name": raw_division_name
                    }
                    pool_obj = Pool(**pool_data)
                    key = (pool_obj.pool_code, pool_obj.league_code, pool_obj.season)
                    existing_pool = existing_pools_dict.get(key)

                    new_pool = await add_or_update_pool(self.session, pool_obj, existing_pool, False)
                    
                    # Appel de handle_csv_download_and_parse en passant le scraper
                    # pour alimenter le cache
                    task = handle_csv_download_and_parse(
                        self,
                        new_pool,
                        raw_season,
                        scraped_pool_ids
                    )
                    tasks.append(task)

                except Exception as e:
                    log_event(
                        action="pool_processing_error",
                        level="error",
                        league_name=league_name,
                        league_code=league_code,
                        error=str(e)
                    )

            # On attend que tous les CSV de toutes les poules soient gérés
            await asyncio.gather(*tasks)
            
            # Désactiver les poules non retrouvées
            missing_pool_ids = {
                pool.id 
                for pool in existing_pools 
                if pool.active 
                and pool.id not in scraped_pool_ids
            }
            if missing_pool_ids:
                log_event(
                    action="bulk_deactivate_pools",
                    level="info",
                    league_name='National',
                    missing_pool_ids=missing_pool_ids,
                    message="Désactivation en masse des poules non scrapées."
                )
                await bulk_deactivate_pools(self.session, missing_pool_ids)

        except Exception as e:
            log_event(
                action="critical_league_error",
                level="error",
                league_name=league_name,
                league_code=league_code,
                error=str(e)
            )