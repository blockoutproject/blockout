import asyncio
from bs4 import BeautifulSoup
from config.logger_config import log_event
from api.pools_api import get_pools_by_league_and_season
from models.pool import Pool, PoolDivisionCode
from models.scraper import Scraper
from services.pools_service import add_or_update_pool, deactivate_pools
from utils.file_utils import create_output_directory, delete_output_directory
from utils.scraper_logic import handle_csv_download_and_parse
from utils.utils import extract_national_division, extract_season_from_url, parse_season, standardize_division_name


class NationalScraper(Scraper):
    def __init__(self, session):
        super().__init__(session, name="national_scraper")
        self.national_url = "http://www.ffvb.org/119-37-1-Championnats-Nationaux"
        self.folder = create_output_directory("National")
        self.league_code = "ABCCS"
        self.league_name = "NATIONAL"

    async def run_scraping(self):
        """
        Logique principale du scraping pour les pools nationales.
        Cette méthode sera automatiquement chronométrée et loguée.
        """
        try:
            # Fetch HTML content
            html_content = await self.fetch(self.national_url)
            if not html_content:
                log_event(
                    action="fetch_html",
                    level="error",
                    league_name=self.league_name,
                    url=self.national_url,
                    message="Échec de la récupération du contenu HTML pour les pools nationales."
                )
                return

            soup = BeautifulSoup(html_content, 'html.parser')
            tasks = []
            scraped_pool_codes = set()
            raw_season = None

            # Extraction de la saison à partir du premier lien valide
            for a_tag in soup.find_all('a', href=lambda href: href and href.endswith('.htm')):
                href = a_tag['href']
                raw_season = extract_season_from_url(href)
                break

            if not raw_season:
                log_event(
                    action="extract_season",
                    level="warning",
                    league_name=self.league_name,
                    url=href,
                    message="Aucune saison trouvée pour l'URL."
                )
                raise ValueError("Saison non trouvée.")

            parsed_season = parse_season(raw_season)

            # Récupération des pools existantes
            existing_pools = await get_pools_by_league_and_season(self.session, self.league_code, parsed_season)
            existing_pools_dict = {(pool.pool_code, pool.league_code, pool.season): pool for pool in existing_pools}

            # Process each pool link
            for a_tag in soup.find_all('a', href=lambda href: href and href.endswith('.htm')):
                try:
                    href = a_tag['href']
                    pool_name = a_tag.get_text(strip=True)
                    pool_code = href.split('_')[-1].replace('.htm', '').upper()

                    raw_division_name = extract_national_division(pool_name)
                    
                    standardized = standardize_division_name(raw_division_name)

                    scraped_pool_codes.add(pool_code)

                    pool_data = {
                        "pool_code": pool_code,
                        "league_code": self.league_code,
                        "season": parsed_season,
                        "league_name": self.league_name,
                        "pool_name": pool_name,
                        "division_code": PoolDivisionCode.NAT,
                        "division_name": standardized["division"],
                        "gender": standardized["gender"],
                        "raw_division_name": raw_division_name,
                    }
                    pool = Pool(**pool_data)

                    key = (pool.pool_code, pool.league_code, pool.season)
                    existing_pool = existing_pools_dict.get(key)

                    # Ajout ou mise à jour de la pool
                    new_pool = await add_or_update_pool(self.session, pool, existing_pool)
                    if new_pool:
                        task = handle_csv_download_and_parse(
                            self.session, new_pool.id, new_pool.league_code, new_pool.pool_code, raw_season, self.folder
                        )
                        tasks.append(task)

                except Exception as e:
                    log_event(
                        action="process_pool_error",
                        level="error",
                        pool_name=pool_name,
                        url=href,
                        error=str(e)
                    )

            # Exécution des tâches de téléchargement CSV
            await asyncio.gather(*tasks)

            # Désactivation des pools non scrapées
            await deactivate_pools(self.session, self.league_code, scraped_pool_codes)

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                league_name=self.league_name,
                error=str(e),
                message="Erreur critique lors du scraping des poules nationales."
            )
        finally:
            delete_output_directory(self.folder)