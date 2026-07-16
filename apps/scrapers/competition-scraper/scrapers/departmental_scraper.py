import asyncio
import re
from bs4 import BeautifulSoup

from api.competitions_api import bulk_deactivate_pools
from api.config_api import (
    create_raw_division_mapping,
    get_raw_division_mappings_by_league_and_season,
)
from api.pools_api import get_pools_by_league_and_season
from models.pool import Pool
from models.raw_division_mapping import RawDivisionMapping
from models.scraper import Scraper
from utils.scraper_logic import handle_csv_download_and_parse
from config.logger_config import log_event
from utils.utils import capitalize_words, strip_department_code


class DepartmentalScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session,
            name="departmental_scraper",
            url="http://www.ffvb.org/122-37-1-Championnats-Departementaux",
            priority_validation_enabled=False,
        )

    async def run_scraping(self):
        try:
            html_content = await self.fetch(self.url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    scope="department_pools",
                    url=self.url,
                    message="Échec de la récupération du contenu HTML pour les pools départementales.",
                )
                return

            soup = BeautifulSoup(html_content, "html.parser")
            league_tables = soup.find_all(
                "table",
                class_=["tableau_bleu", "tableau_rouge", "tableau_violet"],
            )

            league_sema = asyncio.Semaphore(8)

            async def guarded(task_coro):
                async with league_sema:
                    return await task_coro

            tasks = []

            for table in league_tables:
                try:
                    for li in table.select("ul > li"):
                        try:
                            a_tag = li.find("a", href=lambda href: href and "codent=" in href)
                            if not a_tag:
                                continue

                            href = a_tag.get("href", "")
                            league_code_match = re.search(r"codent=([^&]+)", href)
                            if not league_code_match:
                                log_event(
                                    action="missing_league_code",
                                    level="warning",
                                    scope="departmental_pools",
                                    url=href,
                                    message="Lien départemental trouvé sans paramètre codent.",
                                )
                                continue

                            league_code = league_code_match.group(1)

                            if league_code in ("LIGU", "LIMY", "LIMART", "LIRE", "LIGY"):
                                continue

                            raw_department_name = li.get_text(strip=True)
                            clean_name = strip_department_code(raw_department_name)
                            league_name = capitalize_words(clean_name)

                            league_page_url = href.replace("https://", "http://")
                            tasks.append(
                                guarded(
                                    self.scrape_pools_from_league(
                                        league_code=league_code,
                                        league_name=league_name,
                                        league_page_url=league_page_url,
                                    )
                                )
                            )

                        except Exception as e:
                            log_event(
                                action="department_processing_error",
                                level="error",
                                scope="departmental_pools",
                                error=repr(e),
                                message="Erreur lors du traitement d'un département.",
                            )

                except Exception as e:
                    log_event(
                        action="region_block_processing_error",
                        level="error",
                        scope="departmental_pools",
                        error=repr(e),
                        message="Erreur lors du traitement d'un bloc de région pour les départementaux.",
                    )

            if tasks:
                await asyncio.gather(*tasks)

            await self.finalize_matches_updates()
            await self.finalize_associations_updates()

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                scope="departmental_pools",
                error=repr(e),
                message="Erreur critique lors du scraping des compétitions départementales.",
            )

    async def scrape_pools_from_league(self, league_code: str, league_name: str, league_page_url: str):
        try:
            league_page_url = league_page_url.replace("https://", "http://")
            html_content = await self.fetch(league_page_url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    league_name=league_name,
                    league_code=league_code,
                )
                return

            soup = BeautifulSoup(html_content, "html.parser")
            pool_links = soup.select('ul#menu > li > ul > li > ul > li > a[href*="poule="]')
            if not pool_links:
                return

            raw_season = None
            for a_tag in pool_links:
                season_match = re.search(r"saison=([^&]+)", a_tag["href"])
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

            async def run_limited(coros, limit=20):
                sem = asyncio.Semaphore(limit)

                async def wrap(c):
                    async with sem:
                        return await c

                return await asyncio.gather(*(wrap(c) for c in coros))

            for a_tag in pool_links:
                try:
                    href = a_tag["href"]
                    pool_code_match = re.search(r"poule=([^&]+)", href)
                    if not pool_code_match:
                        continue

                    pool_code = pool_code_match.group(1)
                    name = a_tag.get_text(strip=True)
                    raw_division_tag = a_tag.find_parent("ul").find_previous_sibling("a")
                    raw_division_name = raw_division_tag.get_text(strip=True) if raw_division_tag else ""

                    mapping = mapping_dict.get(raw_division_name)

                    if not mapping:
                        new_mapping = RawDivisionMapping(
                            raw_division_name=raw_division_name,
                            league_code=league_code,
                            season=raw_season,
                        )
                        created_mapping = await create_raw_division_mapping(self.session, new_mapping)
                        mapping_dict[raw_division_name] = created_mapping
                        continue

                    if not mapping.is_mapped():
                        continue

                    pool_obj = Pool(
                        pool_code=pool_code,
                        league_code=league_code,
                        season=raw_season,
                        league_name=league_name,
                        raw_name=name,
                        name=name,
                        short_name=name,
                        division_id=mapping.division_id,
                        format=mapping.format,
                        gender=mapping.gender,
                    )

                    key = (pool_obj.pool_code, pool_obj.league_code, pool_obj.season)
                    existing_pool = existing_pools_dict.get(key)

                    tasks.append(
                        handle_csv_download_and_parse(
                            self,
                            pool_obj,
                            raw_season,
                            existing_pool=existing_pool,
                            scraped_pool_ids=scraped_pool_ids,
                        )
                    )

                except Exception as e:
                    log_event(action="pool_processing_error", level="error", error=repr(e))

            if tasks:
                await run_limited(tasks, limit=20)

            missing_pool_ids = {
                pool.id for pool in existing_pools
                if pool.active and pool.id not in scraped_pool_ids
            }

            if missing_pool_ids:
                await bulk_deactivate_pools(self.session, missing_pool_ids)

        except Exception as e:
            log_event(action="critical_league_error", level="error", error=repr(e))