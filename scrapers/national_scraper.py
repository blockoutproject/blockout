import asyncio
from bs4 import BeautifulSoup
from api.competitions_api import bulk_deactivate_pools
from api.config_api import create_raw_division_mapping, get_raw_division_mappings_by_league_and_season
from config.logger_config import log_event
from api.pools_api import get_pools_by_league_and_season
from models.enums.category import Category
from models.pool import Pool
from models.scraper import Scraper
from models.raw_division_mapping import RawDivisionMapping
from utils.scraper_logic import handle_csv_download_and_parse
from utils.utils import extract_season_from_url, parse_season

class NationalScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session, name="national_scraper",
            category=Category.NAT,
            url="http://www.ffvb.org/index.php?lvlid=119&dsgtypid=37&artid=1151&pos=1",
            priority_validation_enabled=False
        )
        self.league_code = "ABCCS"
        self.league_name = "NATIONAL"

    async def run_scraping(self):
        try:
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

            for a_tag in soup.find_all('a', href=lambda href: href and href.endswith('.htm')):
                href = a_tag['href']
                raw_season = extract_season_from_url(href)
                break

            if not raw_season:
                raise ValueError("Saison non trouvée.")

            parsed_season = parse_season(raw_season)

            existing_pools = await get_pools_by_league_and_season(self.session, self.league_code, parsed_season)
            existing_pools_dict = {(p.pool_code, p.league_code, p.season): p for p in existing_pools}

            raw_mappings = await get_raw_division_mappings_by_league_and_season(self.session, self.league_code, parsed_season)
            mapping_dict = {m.raw_division_name: m for m in raw_mappings}

            scraped_pool_ids = set()

            for a_tag in soup.find_all('a', href=lambda href: href and href.endswith('.htm')):
                try:
                    href = a_tag['href']
                    name = a_tag.get_text(strip=True)
                    pool_code = href.split('_')[-1].replace('.htm', '').upper()

                    mapping = mapping_dict.get(name)

                    if not mapping:
                        new_mapping = RawDivisionMapping(
                            raw_division_name=name,
                            league_code=self.league_code,
                            season=parsed_season
                        )
                        created_mapping = await create_raw_division_mapping(self.session, new_mapping)
                        mapping_dict[name] = created_mapping
                        continue

                    if not mapping.is_mapped():
                        continue
                    
                    pool_obj = Pool(
                        pool_code=pool_code,
                        league_code=self.league_code,
                        season=parsed_season,
                        league_name=self.league_name,
                        name=name,
                        division_code=mapping.division_code,
                        format=mapping.format,
                        gender=mapping.gender,
                    )

                    existing_pool = existing_pools_dict.get((pool_obj.pool_code, pool_obj.league_code, pool_obj.season))

                    task = handle_csv_download_and_parse(
                        self,
                        pool_obj,
                        raw_season,
                        existing_pool=existing_pool,
                        scraped_pool_ids=scraped_pool_ids,
                    )
                    tasks.append(task)

                except Exception as e:
                    log_event(
                        action="pool_processing_error",
                        level="error",
                        name=name,
                        url=href,
                        error=str(e)
                    )

            await asyncio.gather(*tasks)
            await self.finalize_matches_updates()
            await self.finalize_associations_updates()

            missing_pool_ids = {
                pool.id for pool in existing_pools if pool.active and pool.id not in scraped_pool_ids
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