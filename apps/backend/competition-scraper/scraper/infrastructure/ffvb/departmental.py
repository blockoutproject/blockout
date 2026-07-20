import asyncio
import re

from bs4 import BeautifulSoup

from scraper.application.calendar_ingestion import handle_csv_download_and_parse
from scraper.application.source import Scraper
from scraper.domain.normalization import capitalize_words, strip_department_code
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
                            a_tag = li.find(
                                "a", href=lambda href: href and "codent=" in href
                            )
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

                            leagueCode = league_code_match.group(1)

                            if leagueCode in ("LIGU", "LIMY", "LIMART", "LIRE", "LIGY"):
                                continue

                            raw_department_name = li.get_text(strip=True)
                            clean_name = strip_department_code(raw_department_name)
                            leagueName = capitalize_words(clean_name)

                            league_page_url = href.replace("https://", "http://")
                            tasks.append(
                                guarded(
                                    self.scrape_pools_from_league(
                                        leagueCode=leagueCode,
                                        leagueName=leagueName,
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

    async def scrape_pools_from_league(
        self, leagueCode: str, leagueName: str, league_page_url: str
    ):
        try:
            league_page_url = league_page_url.replace("https://", "http://")
            html_content = await self.fetch(league_page_url)
            if not html_content:
                log_event(
                    action="fetch_html_error",
                    level="error",
                    leagueName=leagueName,
                    leagueCode=leagueCode,
                )
                return

            soup = BeautifulSoup(html_content, "html.parser")
            pool_links = soup.select(
                'ul#menu > li > ul > li > ul > li > a[href*="poule="]'
            )
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

            existing_pools = await get_pools_by_league_and_season(
                self.session, leagueCode, raw_season
            )
            existing_pools_dict = {
                (p.poolCode, p.leagueCode, p.season): p for p in existing_pools
            }

            raw_mappings = await get_raw_division_mappings_by_league_and_season(
                self.session, leagueCode, raw_season
            )
            mapping_dict = {m.rawDivisionName: m for m in raw_mappings}

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

                    poolCode = pool_code_match.group(1)
                    name = a_tag.get_text(strip=True)
                    raw_division_tag = a_tag.find_parent("ul").find_previous_sibling(
                        "a"
                    )
                    rawDivisionName = (
                        raw_division_tag.get_text(strip=True)
                        if raw_division_tag
                        else ""
                    )

                    mapping = mapping_dict.get(rawDivisionName)

                    if not mapping:
                        new_mapping = RawDivisionMappingInternalResponse(
                            rawDivisionName=rawDivisionName,
                            leagueCode=leagueCode,
                            season=raw_season,
                        )
                        created_mapping = await create_raw_division_mapping(
                            self.session, new_mapping
                        )
                        mapping_dict[rawDivisionName] = created_mapping
                        continue

                    if not mapping.is_mapped():
                        continue

                    pool_obj = PoolInternalResponse(
                        poolCode=poolCode,
                        leagueCode=leagueCode,
                        season=raw_season,
                        leagueName=leagueName,
                        rawName=name,
                        name=name,
                        shortName=name,
                        divisionId=mapping.divisionId,
                        format=mapping.format,
                        gender=mapping.gender,
                    )

                    key = (pool_obj.poolCode, pool_obj.leagueCode, pool_obj.season)
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
                    log_event(
                        action="pool_processing_error", level="error", error=repr(e)
                    )

            if tasks:
                await run_limited(tasks, limit=20)

            missing_pool_ids = {
                pool.id
                for pool in existing_pools
                if pool.active and pool.id not in scraped_pool_ids
            }

            if missing_pool_ids:
                await bulk_deactivate_pools(self.session, missing_pool_ids)

        except Exception as e:
            log_event(action="critical_league_error", level="error", error=repr(e))
