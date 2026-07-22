"""Generated Blockout API adapters for Club ingestion."""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Iterable
from contextlib import asynccontextmanager

from blockout_contract_clients.club.api.club_api import ClubApi
from blockout_contract_clients.club.api_client import ApiClient as ClubApiClient
from blockout_contract_clients.club.configuration import (
    Configuration as ClubConfiguration,
)
from blockout_contract_clients.club.exceptions import ApiException as ClubApiException
from blockout_contract_clients.club.models.club_internal_response import (
    ClubInternalResponse,
)
from blockout_contract_clients.club.models.create_club_internal_request import (
    CreateClubInternalRequest,
)
from blockout_contract_clients.club.models.update_club_internal_request import (
    UpdateClubInternalRequest,
)
from blockout_contract_clients.competition.api.competition_association_api import (
    CompetitionAssociationApi,
)
from blockout_contract_clients.competition.api_client import (
    ApiClient as CompetitionApiClient,
)
from blockout_contract_clients.competition.configuration import (
    Configuration as CompetitionConfiguration,
)
from blockout_contract_clients.competition.exceptions import (
    ApiException as CompetitionApiException,
)
from blockout_contract_clients.competition.models.bulk_deactivate_clubs_internal_request import (
    BulkDeactivateClubsInternalRequest,
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
from blockout_contract_clients.team.api.team_api import TeamApi
from blockout_contract_clients.team.api_client import ApiClient as TeamApiClient
from blockout_contract_clients.team.configuration import (
    Configuration as TeamConfiguration,
)
from blockout_contract_clients.team.exceptions import ApiException as TeamApiException

from scraper.config.settings import Settings
from scraper.domain.models import Club
from scraper.infrastructure.blockout.auth import TokenStore

_CLUB_API_PATH = "/api/v1/clubs"
_COMPETITION_API_PATH = "/api/v1/competitions"
_CONFIG_API_PATH = "/api/v1/config"
_TEAM_API_PATH = "/api/v1/teams"
_EMPTY_IMAGE_PART = ("image", b"")


class BlockoutClients:
    """Expose domain-shaped operations backed by generated Blockout clients."""

    def __init__(
        self,
        tokens: TokenStore,
        club_api: ClubApi,
        scraper_status_api: ScraperStatusApi,
        team_api: TeamApi,
        competition_api: CompetitionAssociationApi,
    ) -> None:
        self._tokens = tokens
        self._club_api = club_api
        self._scraper_status_api = scraper_status_api
        self._team_api = team_api
        self._competition_api = competition_api

    async def get_all_clubs(self) -> list[Club]:
        """Return owner Clubs as mutable ingestion candidates."""
        clubs = await _call(
            self._club_api.list_clubs(
                _headers=self._tokens.headers(),
                _request_timeout=60,
            ),
            ClubApiException,
        )
        return [_to_club(club) for club in clubs]

    async def get_unique_club_ids(self) -> list[str]:
        """Return Club identifiers referenced by teams-service."""
        identifiers = await _call(
            self._team_api.get_unique_club_ids(
                _headers=self._tokens.headers(),
                _request_timeout=60,
            ),
            TeamApiException,
        )
        return identifiers or []

    async def scraper_enabled(self, name: str) -> bool:
        """Return the owner-controlled enabled flag for this scraper."""
        response = await _call(
            self._scraper_status_api.get_scraper_status(
                ScraperNameEnum(name),
                _headers=self._tokens.headers(),
                _request_timeout=10,
            ),
            ConfigApiException,
        )
        return response.enabled

    async def create_club(self, club: Club) -> Club:
        """Create one owner Club from a domain candidate."""
        response = await _call(
            self._club_api.create_club(
                data=_create_request(club).to_json(),
                image=_EMPTY_IMAGE_PART,
                _headers=self._tokens.headers(),
                _request_timeout=60,
            ),
            ClubApiException,
        )
        return _to_club(response)

    async def update_club(self, club: Club) -> Club:
        """Update one owner Club from a domain candidate."""
        response = await _call(
            self._club_api.update_club(
                id=club.id,
                data=_update_request(club).to_json(),
                image=_EMPTY_IMAGE_PART,
                _headers=self._tokens.headers(),
                _request_timeout=60,
            ),
            ClubApiException,
        )
        return _to_club(response)

    async def bulk_deactivate_clubs(self, identifiers: Iterable[str]) -> None:
        """Deactivate owner associations for Clubs absent from a complete run."""
        await _call(
            self._competition_api.bulk_deactivate_clubs(
                BulkDeactivateClubsInternalRequest(
                    missing_club_ids=sorted(identifiers)
                ),
                _headers=self._tokens.headers(),
                _request_timeout=60,
            ),
            CompetitionApiException,
        )


@asynccontextmanager
async def open_blockout_clients(
    settings: Settings,
    tokens: TokenStore,
) -> AsyncIterator[BlockoutClients]:
    """Open every generated client required by one Club ingestion scope."""
    async with (
        build_club_api_client(settings) as club_client,
        build_config_api_client(settings) as config_client,
        build_team_api_client(settings) as team_client,
        build_competition_api_client(settings) as competition_client,
    ):
        yield BlockoutClients(
            tokens,
            ClubApi(club_client),
            ScraperStatusApi(config_client),
            TeamApi(team_client),
            CompetitionAssociationApi(competition_client),
        )


def build_club_api_client(settings: Settings) -> ClubApiClient:
    """Configure the generated clubs-service client."""
    return ClubApiClient(
        ClubConfiguration(
            host=_service_host(settings.club_api_url, _CLUB_API_PATH, "CLUB_API_URL"),
            connection_pool_maxsize=20,
            verify_ssl=False,
        )
    )


def build_config_api_client(settings: Settings) -> ConfigApiClient:
    """Configure the generated config-service client."""
    return ConfigApiClient(
        ConfigConfiguration(
            host=_service_host(
                settings.config_api_url, _CONFIG_API_PATH, "CONFIG_API_URL"
            ),
            connection_pool_maxsize=20,
            verify_ssl=False,
        )
    )


def build_team_api_client(settings: Settings) -> TeamApiClient:
    """Configure the generated teams-service client."""
    return TeamApiClient(
        TeamConfiguration(
            host=_service_host(settings.team_api_url, _TEAM_API_PATH, "TEAM_API_URL"),
            connection_pool_maxsize=20,
            verify_ssl=False,
        )
    )


def build_competition_api_client(settings: Settings) -> CompetitionApiClient:
    """Configure the generated competition-service client."""
    return CompetitionApiClient(
        CompetitionConfiguration(
            host=_service_host(
                settings.competition_api_url,
                _COMPETITION_API_PATH,
                "COMPETITION_API_URL",
            ),
            connection_pool_maxsize=20,
            verify_ssl=False,
        )
    )


def _service_host(url: str | None, path: str, variable: str) -> str:
    if not url or not url.endswith(path):
        raise ValueError(f"{variable} must end with '{path}'.")
    return url.removesuffix(path)


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


async def _call[T](request: Awaitable[T], error_type: type[Exception]) -> T:
    try:
        return await request
    except error_type as error:
        detail = (
            getattr(error, "body", None)
            or getattr(error, "reason", None)
            or "Unknown error"
        )
        raise RuntimeError(
            f"Erreur API {getattr(error, 'status', None)}: {detail}"
        ) from error
