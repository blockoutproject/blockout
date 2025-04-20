import asyncio
from bs4 import BeautifulSoup
from api.competitions_api import bulk_deactivate_pools
from config.logger_config import log_event
from api.pools_api import get_pools_by_league_and_season
from models.category import Category
from services.pools_service import add_or_update_pool
from models.pool import Pool, PoolDivisionCode
from models.scraper import Scraper
from utils.scraper_logic import handle_csv_download_and_parse
from utils.utils import extract_national_division, extract_season_from_url, parse_season, standardize_division_name

class NationalScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session, name="national_scraper", 
            category=Category.NAT, 
            url="http://www.ffvb.org/119-37-1-Championnats-Nationaux", 
            priority_validation_enabled=False
        )
        self.league_code = "ABCCS"
        self.league_name = "NATIONAL"

    async def run_scraping(self):
        """
        Logique principale du scraping pour les pools nationales.
        Cette méthode sera automatiquement chronométrée et loguée.
        """
        try:
            # Récupération de la page HTML
            html_content = await self.fetch(self.url)
            if not html_content:
                log_event(
                    action="fetch_html",
                    level="error",
                    league_name=self.league_name,
                    url=self.url,
                    message="Échec de la récupération du contenu HTML pour les pools nationales."
                )
                return

            soup = BeautifulSoup(html_content, 'html.parser')
            tasks = []
            raw_season = None

            # Extraction de la saison à partir du premier lien valide (par exemple .htm)
            for a_tag in soup.find_all('a', href=lambda href: href and href.endswith('.htm')):
                href = a_tag['href']
                raw_season = extract_season_from_url(href)
                break

            if not raw_season:
                log_event(
                    action="extract_season",
                    level="warning",
                    league_name=self.league_name,
                    message="Aucune saison trouvée pour l'URL."
                )
                raise ValueError("Saison non trouvée.")

            parsed_season = parse_season(raw_season)

            # Récupération des pools existantes
            existing_pools = await get_pools_by_league_and_season(
                self.session, self.league_code, parsed_season
            )
            existing_pools_dict = {
                (p.pool_code, p.league_code, p.season): p
                for p in existing_pools
            }
            
            # Set local pour gérer la désactivation par league
            scraped_pool_ids = set()

            # Parcours de chaque lien .htm (chaque poule)
            for a_tag in soup.find_all('a', href=lambda href: href and href.endswith('.htm')):
                try:
                    href = a_tag['href']
                    pool_name = a_tag.get_text(strip=True)
                    pool_code = href.split('_')[-1].replace('.htm', '').upper()

                    # Extraction de la division
                    raw_division_name = extract_national_division(pool_name)

                    # Standardisation
                    standardized = standardize_division_name(raw_division_name, PoolDivisionCode.NAT, pool_code)

                    # Construction de l'objet Pool
                    pool_data = {
                        "pool_code": pool_code,
                        "league_code": self.league_code,
                        "season": parsed_season,
                        "league_name": self.league_name,
                        "pool_name": pool_name,
                        "division_code": PoolDivisionCode.NAT,
                        "division_name": standardized["division_name"],
                        "format": standardized["format"],
                        "gender": standardized["gender"],
                        "raw_division_name": raw_division_name,
                    }
                    pool_obj = Pool(**pool_data)
                    key = (pool_obj.pool_code, pool_obj.league_code, pool_obj.season)
                    existing_pool = existing_pools_dict.get(key)

                    # Ajout / Mise à jour de la Pool
                    new_pool = await add_or_update_pool(self.session, pool_obj, existing_pool, False)
                    
                    # Appel de la logique CSV, on passe le scraper
                    # pour écrire les matches dans le cache
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
                        pool_name=pool_name,
                        url=href,
                        error=str(e)
                    )

            # Exécution parallèle du téléchargement CSV
            await asyncio.gather(*tasks)

            # Finalisation : on applique toutes les modifications pour les matchs
            await self.finalize_matches_updates()
            
            # Finalisation : on applique toutes les modifications pour les associations
            await self.finalize_associations_updates()
            
            # Désactivation des pools non scrapées
            missing_pool_ids = {
                pool.id 
                for pool in existing_pools 
                if pool.active 
                and pool.id not in scraped_pool_ids
            }
            if missing_pool_ids:
                await bulk_deactivate_pools(self.session, missing_pool_ids)
            
        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                league_name=self.league_name,
                error=str(e),
                message="Erreur critique lors du scraping des poules nationales."
            )