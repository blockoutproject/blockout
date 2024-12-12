import asyncio
import re
from bs4 import BeautifulSoup
from api.pools_api import get_pools_by_league_and_season
from models.pool import Pool, PoolDivisionCode
from models.scraper import Scraper
from services.pools_service import add_or_update_pool, deactivate_pools
from utils.file_utils import create_output_directory, delete_output_directory
from utils.scraper_logic import handle_csv_download_and_parse
from utils.utils import parse_season, standardize_division_name
from config.logger_config import log_event, logger


class RegionalScraper(Scraper):
    def __init__(self, session):
        super().__init__(session, name="regional_scraper")
        self.regional_url = "http://www.ffvb.org/120-37-1-Championnats-Regionaux"
        self.folder = create_output_directory("Regional")

    async def run_scraping(self):
        """
        Logique principale du scraping pour les pools régionales.
        Cette méthode est automatiquement chronométrée et loguée.
        """
        log_event(action="start_scraping", level="debug", scope="regional_pools")

        scraped_league_codes = set()
        try:
            html_content = await self.fetch(self.regional_url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    scope="regional_pools",
                    url=self.regional_url,
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
                        scraped_league_codes.add(league_code)

                        task = self.scrape_pools_from_league(
                            league_code, league_name, league_page_url
                        )
                        tasks.append(task)
                except Exception as e:
                    log_event(
                        action="league_processing_error",
                        level="error",
                        scope="regional_pools",
                        error=str(e),
                        message="Erreur lors du traitement d'une ligue régionale."
                    )

            await asyncio.gather(*tasks)

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                scope="regional_pools",
                error=str(e),
                message="Erreur critique lors du scraping des poules régionales."
            )
        finally:
            delete_output_directory(self.folder)
            log_event(action="end_scraping", level="debug", scope="regional_pools")

    async def scrape_pools_from_league(self, league_code, league_name, league_page_url):
        scraped_pool_codes = set()
        try:
            if league_code not in ['LIMY', 'LIGY', 'LIGU', 'LIMART', 'LIRE']:
                log_event(
                    action="start_league_scraping",
                    level="debug",
                    league_name=league_name,
                    league_code=league_code
                )

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

                raw_season = None
                for a_tag in pool_links:
                    href = a_tag['href']
                    season_match = re.search(r'saison=([^&]+)', href)
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
                log_event(
                    action="parse_season",
                    level="debug",
                    league_name=league_name,
                    league_code=league_code,
                    raw_season=raw_season,
                    parsed_season=parsed_season
                )

                existing_pools = await get_pools_by_league_and_season(self.session, league_code, parsed_season)
                existing_pools_dict = {(pool.pool_code, pool.league_code, pool.season): pool for pool in existing_pools}

                for a_tag in pool_links:
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
                        raw_division_tag = a_tag.find_parent('ul').find_previous_sibling('a')
                        raw_division_name = raw_division_tag.get_text(strip=True) if raw_division_tag else ""
                        standardized = standardize_division_name(raw_division_name)

                        scraped_pool_codes.add(pool_code)

                        pool_data = {
                            "pool_code": pool_code,
                            "league_code": league_code,
                            "season": parsed_season,
                            "league_name": league_name,
                            "pool_name": pool_name,
                            "division_code": PoolDivisionCode.REG,
                            "division_name": standardized["division"],
                            "gender": standardized["gender"],
                            "raw_division_name": raw_division_name
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
                                league_code=new_pool.league_code,
                                pool_id=new_pool.id,
                                status="processed"
                            )
                            task = handle_csv_download_and_parse(
                                self.session, new_pool.id, new_pool.league_code, new_pool.pool_code, raw_season, self.folder
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

                await asyncio.gather(*tasks)

            await deactivate_pools(self.session, league_code, scraped_pool_codes)

        except Exception as e:
            log_event(
                action="critical_league_error",
                level="error",
                league_name=league_name,
                league_code=league_code,
                error=str(e)
            )

        log_event(
            action="end_league_scraping",
            level="debug",
            league_name=league_name,
            league_code=league_code
        )