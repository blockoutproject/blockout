from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import UTC, datetime

from prometheus_client import Gauge

from scraper.application.club_writer import ClubWriter
from scraper.application.models import Club
from scraper.application.ports import BlockoutPort, FfvbPort
from scraper.infrastructure.ffvb.models import FfvbClubRecord
from scraper.infrastructure.ffvb.parser import parse_club_page
from scraper.observability.logging import current_scraper, log_event


class ClubIngestion:
    """Coordinate one complete club ingestion run."""

    def __init__(
        self,
        blockout: BlockoutPort,
        ffvb: FfvbPort,
        duration_gauge: Gauge,
    ) -> None:
        self._blockout = blockout
        self._ffvb = ffvb
        self._duration_gauge = duration_gauge
        self._writer = ClubWriter(blockout)
        self._clubs: dict[str, tuple[Club | None, Club]] = {}
        self.scraped_club_ids: set[str] = set()
        self.scrape_success = 0

    async def run(self) -> None:
        """Load owner state, ingest every referenced club, and record duration."""
        current_scraper.set("club_scraper")
        started_at = datetime.now(UTC)
        try:
            await self._initialize_cache()
            club_ids = await self._blockout.get_unique_club_ids()
            await self._ingest_clubs(club_ids)
        except Exception as error:
            log_event(
                action="scraping_error",
                level="error",
                error=str(error),
                message="Erreur dans le scraper club_scraper",
            )
            raise
        finally:
            duration = (datetime.now(UTC) - started_at).total_seconds()
            self._duration_gauge.set(duration)

    async def _initialize_cache(self) -> None:
        try:
            for club in await self._blockout.get_all_clubs() or []:
                self._clubs.setdefault(club.id, (club, replace(club)))
        except Exception as error:
            log_event(
                action="init_clubs_cache_error",
                level="error",
                error=str(error),
                message="Erreur lors du chargement des clubs existants",
            )

    async def _ingest_clubs(self, identifiers: list[str]) -> None:
        try:
            await asyncio.gather(
                *(self._ingest_club(identifier) for identifier in identifiers)
            )
            if self.scrape_success == 0:
                log_event(
                    action="skip_bulk_deactivate_no_contact",
                    level="warning",
                    message=(
                        "Aucune page de l'adressier n'a pu être récupérée (HTML vide/erreur réseau). "
                        "On saute la désactivation pour éviter un faux positif (IP bloquée, "
                        "site indisponible, etc.)."
                    ),
                )
                return

            missing = {
                candidate.id
                for _, candidate in self._clubs.values()
                if candidate.id not in self.scraped_club_ids
            }
            if missing:
                log_event(
                    action="bulk_deactivate_clubs",
                    level="info",
                    missing_pool_ids=missing,
                    message=(
                        "Désactivation en masse des clubs non scrapés "
                        "(au moins une requête réussie)."
                    ),
                )
                await self._blockout.bulk_deactivate_clubs(missing)
        except Exception as error:
            log_event(
                action="club_scraper_critical_error",
                level="error",
                error=str(error),
                message="Erreur critique lors du scraping des clubs.",
            )

    async def _ingest_club(self, identifier: str) -> None:
        try:
            html = await self._ffvb.fetch_club_page(identifier)
            if not html:
                log_event(
                    action="club_scraper_fetch_html_error",
                    level="error",
                    url=(
                        "https://www.ffvbbeach.org/ffvbapp/adressier/rech_aff_club.php"
                    ),
                    message=(
                        "https://www.ffvbbeach.org/ffvbapp/adressier/rech_aff_club.php "
                        "- Contenu HTML vide ou inexistant."
                    ),
                )
                return

            self.scrape_success += 1
            provider_club = parse_club_page(html, identifier)
            if provider_club is None:
                return

            existing, candidate = self._clubs.get(
                identifier,
                (None, _new_candidate(provider_club)),
            )
            if existing is not None:
                _merge_provider_fields(candidate, provider_club)
            saved = await self._writer.save(candidate, existing)
            self.scraped_club_ids.add(saved.id)
        except Exception as error:
            url = "https://www.ffvbbeach.org/ffvbapp/adressier/rech_aff_club.php"
            log_event(
                action="club_scraper_error",
                level="error",
                url=url,
                error=str(error),
                message=f"{url} - Erreur lors du scraping d'un club.",
            )


def _new_candidate(club: FfvbClubRecord) -> Club:
    return Club(
        id=club.identifier,
        raw_name=club.raw_name,
        name=club.name,
        address=club.address,
        city=club.city,
        postal_code=club.postal_code,
        email=club.email,
        phone_number=club.phone_number,
        website=club.website,
    )


def _merge_provider_fields(candidate: Club, provider: FfvbClubRecord) -> None:
    candidate.name = provider.name
    candidate.city = provider.city
    candidate.postal_code = provider.postal_code
    candidate.email = provider.email
    candidate.phone_number = provider.phone_number
    candidate.website = provider.website
    candidate.address = provider.address
