import aiohttp
import httpx
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.team.api.team_api import TeamApi

from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.departmental import DepartmentalScraper
from scraper.infrastructure.ffvb.national import NationalScraper
from scraper.infrastructure.ffvb.regional import RegionalScraper
from scraper.infrastructure.lnv.professional import ProScraper


class ScraperFactory:
    @staticmethod
    def create_scraper(
        scraper_type: str,
        session: aiohttp.ClientSession,
        provider_client: httpx.AsyncClient,
        raw_division_mapping_api: RawDivisionMappingApi | None = None,
        team_api: TeamApi | None = None,
    ) -> Scraper:
        if scraper_type == "pro":
            return ProScraper(
                session, provider_client, raw_division_mapping_api, team_api
            )
        elif scraper_type == "national":
            return NationalScraper(
                session, provider_client, raw_division_mapping_api, team_api
            )
        elif scraper_type == "regional":
            return RegionalScraper(
                session, provider_client, raw_division_mapping_api, team_api
            )
        elif scraper_type == "departmental":
            return DepartmentalScraper(
                session, provider_client, raw_division_mapping_api, team_api
            )
        else:
            raise ValueError(f"Type de scraper inconnu: {scraper_type}")
