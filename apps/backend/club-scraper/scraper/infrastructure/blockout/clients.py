from __future__ import annotations

import json
from collections.abc import Iterable

import aiohttp

from scraper.config.settings import Settings
from scraper.infrastructure.blockout.auth import TokenStore
from scraper.infrastructure.blockout.contracts import (
    BulkDeactivateClubsInternalRequest,
    ClubInternalResponse,
    CreateClubInternalRequest,
    ScraperStatusInternalResponse,
    UpdateClubInternalRequest,
)
from scraper.infrastructure.blockout.response import read_json


class BlockoutClients:
    """Typed access to the four internal APIs used by club ingestion."""

    def __init__(
        self, session: aiohttp.ClientSession, settings: Settings, tokens: TokenStore
    ) -> None:
        self._session = session
        self._settings = settings
        self._tokens = tokens

    async def get_all_clubs(self) -> list[ClubInternalResponse]:
        response = await self._session.get(
            self._settings.club_api_url,
            headers=self._tokens.headers(),
        )
        data = await read_json(response)
        return (
            []
            if data is None
            else [ClubInternalResponse.from_json(item) for item in data]
        )

    async def get_unique_club_ids(self) -> list[str]:
        response = await self._session.get(
            f"{self._settings.team_api_url}/club-ids",
            headers=self._tokens.headers(),
        )
        data = await read_json(response)
        return [] if data is None else data

    async def get_scraper_status(self, name: str) -> ScraperStatusInternalResponse:
        response = await self._session.get(
            f"{self._settings.config_api_url}/scrapers/{name}/status",
            headers=self._tokens.headers(),
        )
        return ScraperStatusInternalResponse.from_json(await read_json(response))

    async def create_club(
        self,
        club: ClubInternalResponse,
    ) -> ClubInternalResponse:
        request = _create_request(club)
        form = aiohttp.FormData()
        form.add_field(
            "data", json.dumps(request.to_json()), content_type="application/json"
        )
        response = await self._session.post(
            self._settings.club_api_url,
            data=form,
            headers=self._tokens.headers(),
        )
        return ClubInternalResponse.from_json(await read_json(response))

    async def update_club(
        self,
        club: ClubInternalResponse,
    ) -> ClubInternalResponse:
        request = _update_request(club)
        form = aiohttp.FormData()
        form.add_field(
            "data", json.dumps(request.to_json()), content_type="application/json"
        )
        response = await self._session.put(
            f"{self._settings.club_api_url}/{club.id}",
            data=form,
            headers=self._tokens.headers(),
        )
        return ClubInternalResponse.from_json(await read_json(response))

    async def bulk_deactivate_clubs(self, identifiers: Iterable[str]) -> None:
        request = BulkDeactivateClubsInternalRequest(list(identifiers))
        response = await self._session.put(
            f"{self._settings.competition_api_url}/clubs/bulk-deactivate",
            json=request.to_json(),
            headers=self._tokens.headers(),
        )
        await read_json(response)


def _create_request(club: ClubInternalResponse) -> CreateClubInternalRequest:
    return CreateClubInternalRequest(
        id=club.id,
        rawName=club.rawName,
        name=club.name,
        address=club.address,
        city=club.city,
        postalCode=club.postalCode,
        email=club.email,
        phoneNumber=club.phoneNumber,
        website=club.website,
        logoUrl=club.logoUrl,
    )


def _update_request(club: ClubInternalResponse) -> UpdateClubInternalRequest:
    return UpdateClubInternalRequest(
        rawName=club.rawName,
        name=club.name,
        address=club.address,
        city=club.city,
        postalCode=club.postalCode,
        email=club.email,
        phoneNumber=club.phoneNumber,
        website=club.website,
        logoUrl=club.logoUrl,
    )
