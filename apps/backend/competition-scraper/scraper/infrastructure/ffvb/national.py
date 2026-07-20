import asyncio

from bs4 import BeautifulSoup

from scraper.application.calendar_ingestion import handle_csv_download_and_parse
from scraper.application.source import Scraper
from scraper.domain.normalization import extract_season_from_url
from scraper.infrastructure.blockout.competitions import bulk_deactivate_pools
from scraper.infrastructure.blockout.configuration import (
    create_raw_division_mapping,
    get_raw_division_mappings_by_league_and_season,
)
from scraper.infrastructure.blockout.pool import PoolInternalResponse
from scraper.infrastructure.blockout.pools import get_pools_by_league_and_season
from scraper.infrastructure.blockout.raw_division_mapping import (
    RawDivisionMappingInternalResponse,
)
from scraper.observability.logging import log_event


class NationalScraper(Scraper):
    def __init__(self, session):
        super().__init__(
            session,
            name="national_scraper",
            url="http://www.ffvb.org/119-37-1-Championnats-Nationaux",
            priority_validation_enabled=False,
        )
        self.leagueCode = "ABCCS"
        self.leagueName = "Nationale"

    async def run_scraping(self):
        try:
            html_content = await self.fetch(self.url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    leagueName=self.leagueName,
                    url=self.url,
                    message="Échec de la récupération du contenu HTML pour les pools nationales.",
                )
                return

            soup = BeautifulSoup(html_content, "html.parser")

            links = [
                a
                for a in soup.find_all("a", href=lambda h: h and h.endswith(".htm"))
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

            existing_pools = await get_pools_by_league_and_season(
                self.session, self.leagueCode, raw_season
            )
            existing_pools_dict = {
                (p.poolCode, p.leagueCode, p.season): p for p in (existing_pools or [])
            }

            raw_mappings = await get_raw_division_mappings_by_league_and_season(
                self.session, self.leagueCode, raw_season
            )
            mapping_dict = {m.rawDivisionName: m for m in (raw_mappings or [])}

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
                    poolCode = href.split("_")[-1].replace(".htm", "").upper()
                    mapping = mapping_dict.get(name)

                    if not mapping:
                        pool_tasks.append(
                            guarded(
                                self._create_mapping(
                                    mapping_dict=mapping_dict,
                                    rawDivisionName=name,
                                    raw_season=raw_season,
                                )
                            )
                        )
                        continue

                    if not mapping.is_mapped():
                        continue

                    pool_obj = PoolInternalResponse(
                        poolCode=poolCode,
                        leagueCode=self.leagueCode,
                        season=raw_season,
                        leagueName=self.leagueName,
                        rawName=name,
                        name=name,
                        shortName=name,
                        divisionId=mapping.divisionId,
                        format=mapping.format,
                        gender=mapping.gender,
                    )

                    existing_pool = existing_pools_dict.get(
                        (pool_obj.poolCode, pool_obj.leagueCode, pool_obj.season)
                    )

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
                pool.id
                for pool in (existing_pools or [])
                if pool.active and pool.id not in scraped_pool_ids
            }
            if missing_pool_ids:
                await bulk_deactivate_pools(self.session, missing_pool_ids)

        except Exception as e:
            log_event(
                action="critical_error",
                level="error",
                leagueName=self.leagueName,
                error=repr(e),
                message="Erreur critique lors du scraping des poules nationales.",
            )

    async def _create_mapping(
        self, mapping_dict: dict, rawDivisionName: str, raw_season: str
    ):
        try:
            new_mapping = RawDivisionMappingInternalResponse(
                rawDivisionName=rawDivisionName,
                leagueCode=self.leagueCode,
                season=raw_season,
            )
            created = await create_raw_division_mapping(self.session, new_mapping)
            mapping_dict[rawDivisionName] = created
        except Exception as e:
            log_event(
                action="create_raw_division_mapping_error",
                level="error",
                rawDivisionName=rawDivisionName,
                leagueCode=self.leagueCode,
                error=repr(e),
            )
