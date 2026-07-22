from __future__ import annotations

from collections.abc import Awaitable, Iterable

import aiohttp
from blockout_contract_clients.club.api.club_api import ClubApi
from blockout_contract_clients.club.api_client import ApiClient
from blockout_contract_clients.club.configuration import Configuration
from blockout_contract_clients.club.exceptions import ApiException
from blockout_contract_clients.club.models.club_internal_response import (
    ClubInternalResponse,
)
from blockout_contract_clients.club.models.create_club_internal_request import (
    CreateClubInternalRequest,
)
from blockout_contract_clients.club.models.update_club_internal_request import (
    UpdateClubInternalRequest,
)
from blockout_contract_clients.config.api.scraper_status_api import ScraperStatusApi
from blockout_contract_clients.config.api_client import ApiClient as ConfigApiClient
from blockout_contract_clients.config.configuration import (
    Configuration as ConfigConfiguration,
)
from blockout_contract_clients.config.exceptions import (
    ApiException as ConfigApiException,
)
from blockout_contract_clients.config.models.scraper_name_enum import ScraperNameEnum

from scraper.application.models import Club
from scraper.config.settings import Settings
from scraper.infrastructure.blockout.auth import TokenStore
from scraper.infrastructure.blockout.contracts import (
    BulkDeactivateClubsInternalRequest,
)
from scraper.infrastructure.blockout.response import read_json

_CLUB_API_PATH = "/api/v1/clubs"
_CONFIG_API_PATH = "/api/v1/config"
# The generated HTTPX transport needs one file tuple to retain multipart encoding.
_EMPTY_IMAGE_PART = ("image", b"")


class BlockoutClients:
    """Typed access to the four internal APIs used by club ingestion."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        settings: Settings,
        tokens: TokenStore,
        club_api: ClubApi,
        scraper_status_api: ScraperStatusApi,
    ) -> None:
        self._session = session
        self._settings = settings
        self._tokens = tokens
        self._club_api = club_api
        self._scraper_status_api = scraper_status_api

    async def get_all_clubs(self) -> list[Club]:
        clubs = await _club_call(
            self._club_api.list_clubs(
                _headers=self._tokens.headers(),
                _request_timeout=60,
            )
        )
        return [_to_club(club) for club in clubs]

    async def get_unique_club_ids(self) -> list[str]:
        response = await self._session.get(
            f"{self._settings.team_api_url}/club-ids",
            headers=self._tokens.headers(),
        )
        data = await read_json(response)
        return [] if data is None else data

    async def scraper_enabled(self, name: ScraperNameEnum) -> bool:
        response = await _config_call(
            self._scraper_status_api.get_scraper_status(
                name,
                _headers=self._tokens.headers(),
                _request_timeout=10,
            )
        )
        return response.enabled

    async def create_club(
        self,
        club: Club,
    ) -> Club:
        request = _create_request(club)
        response = await _club_call(
            self._club_api.create_club(
                data=request.to_json(),
                image=_EMPTY_IMAGE_PART,
                _headers=self._tokens.headers(),
                _request_timeout=60,
            )
        )
        return _to_club(response)

    async def update_club(
        self,
        club: Club,
    ) -> Club:
        request = _update_request(club)
        response = await _club_call(
            self._club_api.update_club(
                id=club.id,
                data=request.to_json(),
                image=_EMPTY_IMAGE_PART,
                _headers=self._tokens.headers(),
                _request_timeout=60,
            )
        )
        return _to_club(response)

    async def bulk_deactivate_clubs(self, identifiers: Iterable[str]) -> None:
        request = BulkDeactivateClubsInternalRequest(list(identifiers))
        response = await self._session.put(
            f"{self._settings.competition_api_url}/clubs/bulk-deactivate",
            json=request.to_json(),
            headers=self._tokens.headers(),
        )
        await read_json(response)


def build_club_api_client(settings: Settings) -> ApiClient:
    """Configure the generated HTTPX client from the existing service URL."""
    if not settings.club_api_url.endswith(_CLUB_API_PATH):
        raise ValueError(f"CLUB_API_URL must end with '{_CLUB_API_PATH}'.")
    configuration = Configuration(
        host=settings.club_api_url.removesuffix(_CLUB_API_PATH),
        connection_pool_maxsize=20,
        verify_ssl=False,
    )
    return ApiClient(configuration)


def build_config_api_client(settings: Settings) -> ConfigApiClient:
    """Configure the generated config-service client from its existing URL."""
    if not settings.config_api_url.endswith(_CONFIG_API_PATH):
        raise ValueError(f"CONFIG_API_URL must end with '{_CONFIG_API_PATH}'.")
    configuration = ConfigConfiguration(
        host=settings.config_api_url.removesuffix(_CONFIG_API_PATH),
        connection_pool_maxsize=20,
        verify_ssl=False,
    )
    return ConfigApiClient(configuration)


def _create_request(club: Club) -> CreateClubInternalRequest:
    return CreateClubInternalRequest(
        id=club.id,
        raw_name=club.raw_name,
        name=club.name,
        address=club.address,
        city=club.city,
        postal_code=club.postal_code,
        email=club.email,
        phone_number=club.phone_number,
        website=club.website,
        logo_url=club.logo_url,
    )


def _update_request(club: Club) -> UpdateClubInternalRequest:
    return UpdateClubInternalRequest(
        raw_name=club.raw_name,
        name=club.name,
        address=club.address,
        city=club.city,
        postal_code=club.postal_code,
        email=club.email,
        phone_number=club.phone_number,
        website=club.website,
        logo_url=club.logo_url,
    )


def _to_club(response: ClubInternalResponse) -> Club:
    return Club(
        id=response.id,
        raw_name=response.raw_name,
        name=response.name,
        address=response.address,
        city=response.city,
        postal_code=response.postal_code,
        email=response.email,
        phone_number=response.phone_number,
        website=response.website,
        logo_url=response.logo_url,
        active=response.active,
        latitude=response.latitude,
        longitude=response.longitude,
        created_at=response.created_at,
        last_update=response.last_update,
    )


async def _club_call[T](request: Awaitable[T]) -> T:
    try:
        return await request
    except ApiException as error:
        detail = error.body or error.reason or "Unknown error"
        raise RuntimeError(f"Erreur API {error.status}: {detail}") from error


async def _config_call[T](request: Awaitable[T]) -> T:
    try:
        return await request
    except ConfigApiException as error:
        detail = error.body or error.reason or "Unknown error"
        raise RuntimeError(f"Erreur API {error.status}: {detail}") from error
