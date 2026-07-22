"""Select one concrete competition provider source."""

from scraper.application.ports import BlockoutPort, ProviderHttpPort
from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.departmental import DepartmentalScraper
from scraper.infrastructure.ffvb.national import NationalScraper
from scraper.infrastructure.ffvb.regional import RegionalScraper
from scraper.infrastructure.lnv.professional import ProScraper


def create_scraper(
    scraper_type: str,
    provider_http: ProviderHttpPort,
    blockout: BlockoutPort,
) -> Scraper:
    """Create the configured provider adapter without leaking it into application."""
    scraper_types = {
        "pro": ProScraper,
        "national": NationalScraper,
        "regional": RegionalScraper,
        "departmental": DepartmentalScraper,
    }
    try:
        scraper_class = scraper_types[scraper_type]
    except KeyError as error:
        raise ValueError(f"Type de scraper inconnu: {scraper_type}") from error
    return scraper_class(provider_http, blockout)
