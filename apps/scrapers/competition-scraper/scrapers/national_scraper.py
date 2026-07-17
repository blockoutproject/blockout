import asyncio
from bs4 import BeautifulSoup

from api.competitions_api import bulk_deactivate_pools
from api.config_api import (
    create_raw_division_mapping,
    get_raw_division_mappings_by_league_and_season,
)
from api.pools_api import get_pools_by_league_and_season
from config.logger_config import log_event
from models.pool import Pool
from models.raw_division_mapping import RawDivisionMapping
from models.scraper import Scraper
from utils.scraper_logic import handle_csv_download_and_parse
from utils.utils import extract_season_from_url


class NationalScraper(Scraper):
    def __init__(self, session, blockout_clients):
        super().__init__(
            session,
            blockout_clients,
            name="national_scraper",
            url="http://www.ffvb.org/119-37-1-Championnats-Nationaux",
            priority_validation_enabled=False,
        )
        self.league_code = "ABCCS"
        self.league_name = "Nationale"

    async def run_scraping(self):
        try:
            html_content = await self.fetch(self.url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    league_name=self.league_name,
                    url=self.url,
                    message="Échec de la récupération du contenu HTML pour les pools nationales.",
                )
                return

            soup = BeautifulSoup(html_content, "html.parser")

            links = [
                a for a in soup.find_all("a", href=lambda h: h and h.endswith(".htm"))
                if a.get("href")
            ]
            if not links:
                return

            raw_season = None
            for a in links:
                raw_season = extract_season_from_url(a["href"])
                if raw_season:
                    break
            if not raw_season:
                raise ValueError("Saison non trouvée.")

            existing_pools = await get_pools_by_league_and_season(self.blockout_clients.pools, self.league_code, raw_season)
            existing_pools_dict = {(p.pool_code, p.league_code, p.season): p for p in (existing_pools or [])}

            raw_mappings = await get_raw_division_mappings_by_league_and_season(self.blockout_clients.config, self.league_code, raw_season)
            mapping_dict = {m.raw_division_name: m for m in (raw_mappings or [])}

            scraped_pool_ids: set[int] = set()

            league_sema = asyncio.Semaphore(8)

            async def guarded(task_coro):
                async with league_sema:
                    return await task_coro

            async def run_limited(coros, limit=20):
                sem = asyncio.Semaphore(limit)

                async def wrap(c):
                    async with sem:
                        return await c

                return await asyncio.gather(*(wrap(c) for c in coros))

            pool_tasks = []
            download_tasks = []

            for a_tag in links:
                href = a_tag["href"]
                name = a_tag.get_text(strip=True)

                try:
                    pool_code = href.split("_")[-1].replace(".htm", "").upper()
                    mapping = mapping_dict.get(name)

                    if not mapping:
                        pool_tasks.append(
                            guarded(
                                self._create_mapping(
                                    mapping_dict=mapping_dict,
                                    raw_division_name=name,
                                    raw_season=raw_season,
                                )
                            )
                        )
                        continue

                    if not mapping.is_mapped():
                        continue

                    pool_obj = Pool(
                        pool_code=pool_code,
                        league_code=self.league_code,
                        season=raw_season,
                        league_name=self.league_name,
                        raw_name=name,
                        name=name,
                        short_name=name,
                        division_id=mapping.division_id,
                        format=mapping.format,
                        gender=mapping.gender,
                    )

                    existing_pool = existing_pools_dict.get((pool_obj.pool_code, pool_obj.league_code, pool_obj.season))

                    download_tasks.append(
                        handle_csv_download_and_parse(
                            self,
                            pool_obj,
                            raw_season,
                            existing_pool=existing_pool,
                            scraped_pool_ids=scraped_pool_ids,
                        )
                    )

                except Exception as e:
                    log_event(
                        action="pool_processing_error",
                        level="error",
                        name=name,
                        url=href,
                        error=repr(e),
                    )

            if pool_tasks:
                await asyncio.gather(*pool_tasks)

            if download_tasks:
                await run_limited(download_tasks, limit=20)

            await self.finalize_matches_updates()
            await self.finalize_associations_updates()

            missing_pool_ids = {
                pool.id for pool in (existing_pools or [])
                if pool.active and pool.id not in scraped_pool_ids
            }
            if missing_pool_ids:
                await bulk_deactivate_pools(self.blockout_clients.competition, missing_pool_ids)

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                league_name=self.league_name,
                error=repr(e),
                message="Erreur critique lors du scraping des poules nationales.",
            )

    async def _create_mapping(self, mapping_dict: dict, raw_division_name: str, raw_season: str):
        try:
            new_mapping = RawDivisionMapping(
                raw_division_name=raw_division_name,
                league_code=self.league_code,
                season=raw_season,
            )
            created = await create_raw_division_mapping(self.blockout_clients.config, new_mapping)
            mapping_dict[raw_division_name] = created
        except Exception as e:
            log_event(
                action="create_raw_division_mapping_error",
                level="error",
                raw_division_name=raw_division_name,
                league_code=self.league_code,
                error=repr(e),
            )
