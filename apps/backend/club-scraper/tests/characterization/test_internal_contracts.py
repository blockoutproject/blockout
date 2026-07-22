import asyncio
from datetime import datetime
from typing import get_type_hints

import httpx
import pytest
from blockout_contract_clients.club.api.club_api import ClubApi
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
from blockout_contract_clients.config.models.scraper_name_enum import ScraperNameEnum
from blockout_contract_clients.config.models.scraper_status_internal_response import (
    ScraperStatusInternalResponse,
)
from scraper.application.models import Club
from scraper.config.settings import Settings
from scraper.infrastructure.blockout.auth import TokenStore
from scraper.infrastructure.blockout.clients import (
    BlockoutClients,
    build_club_api_client,
    build_config_api_client,
)
from scraper.infrastructure.blockout.contracts import (
    BulkDeactivateClubsInternalRequest,
)
from scraper.infrastructure.blockout.response import read_json


class RecordingResponse:
    """Minimal internal response double."""

    def __init__(
        self, status=200, payload=None, content_type="application/json", text=""
    ) -> None:
        self.status = status
        self.payload = payload
        self.content_type = content_type
        self._text = text

    async def json(self):
        return self.payload

    async def text(self) -> str:
        return self._text


class RecordingSession:
    """Record internal HTTP operations not migrated in this vertical."""

    def __init__(self, responses) -> None:
        self.responses = list(responses)
        self.calls: list[tuple] = []

    async def get(self, url, **kwargs):
        self.calls.append(("GET", url, kwargs))
        return self.responses.pop(0)

    async def put(self, url, **kwargs):
        self.calls.append(("PUT", url, kwargs))
        return self.responses.pop(0)


def _settings() -> Settings:
    return Settings(
        team_api_url="http://teams.local/api/v1/teams",
        competition_api_url="http://competition.local/api/v1/competitions",
        club_api_url="http://clubs.local/api/v1/clubs",
        config_api_url="http://config.local/api/v1/config",
        log_level="INFO",
        auth0_domain=None,
        auth0_client_id=None,
        auth0_client_secret=None,
        auth0_audience=None,
    )


def _tokens() -> TokenStore:
    tokens = TokenStore()
    tokens.set("test")
    return tokens


def _club_payload() -> dict:
    return {
        "id": "club-1",
        "rawName": "RAW",
        "name": "Club",
        "address": None,
        "city": "Paris",
        "postalCode": "75001",
        "email": None,
        "phoneNumber": None,
        "website": None,
        "logoUrl": "logo.png",
        "active": True,
        "latitude": 48.0,
        "longitude": 2.0,
        "createdAt": "2026-07-20T12:00:00",
        "lastUpdate": "2026-07-20T13:00:00",
    }


def _club() -> Club:
    return Club(
        id="club-1",
        raw_name="RAW",
        name="Club",
        city="Paris",
        postal_code="75001",
        logo_url="logo.png",
    )


def test_generated_club_models_own_the_exact_camel_case_transport() -> None:
    """Protect generated request and response aliases from the owner contract."""
    response = ClubInternalResponse.from_dict(_club_payload())
    create = CreateClubInternalRequest(
        id="club-1",
        raw_name="RAW",
        name="Club",
        city="Paris",
        postal_code="75001",
        logo_url="logo.png",
    )
    update = UpdateClubInternalRequest(
        raw_name="RAW",
        name="Club",
        city="Paris",
        postal_code="75001",
        logo_url="logo.png",
    )

    assert response is not None
    assert response.created_at == datetime.fromisoformat("2026-07-20T12:00:00")
    assert create.to_dict()["rawName"] == "RAW"
    assert create.to_dict()["postalCode"] == "75001"
    assert update.to_dict()["logoUrl"] == "logo.png"
    assert "raw_name" not in create.to_dict()


def test_remaining_competition_contract_stays_characterized() -> None:
    """Protect the competition mirror until its own vertical."""
    assert get_type_hints(BulkDeactivateClubsInternalRequest) == {
        "missingClubIds": list[str]
    }
    assert set(ScraperNameEnum) == {
        ScraperNameEnum.SCRAPER,
        ScraperNameEnum.SCRAPER_CLUBS,
    }


class StatusApiStub:
    async def get_scraper_status(self, name, **_kwargs):
        return ScraperStatusInternalResponse(
            id=1,
            name=name,
            enabled=True,
            last_update=datetime.fromisoformat("2026-07-20T12:00:00"),
        )


def test_clients_use_exact_internal_routes_and_authorization() -> None:
    """Protect the not-yet-migrated team, config, and competition calls."""

    async def scenario() -> None:
        session = RecordingSession(
            [
                RecordingResponse(payload=["club-1"]),
                RecordingResponse(status=204),
            ]
        )
        clients = BlockoutClients(
            session, _settings(), _tokens(), object(), StatusApiStub()
        )

        assert await clients.get_unique_club_ids() == ["club-1"]
        assert await clients.scraper_enabled(ScraperNameEnum.SCRAPER_CLUBS) is True
        await clients.bulk_deactivate_clubs({"club-1"})

        assert session.calls[0] == (
            "GET",
            "http://teams.local/api/v1/teams/club-ids",
            {"headers": {"Authorization": "Bearer test"}},
        )
        assert session.calls[1] == (
            "PUT",
            "http://competition.local/api/v1/competitions/clubs/bulk-deactivate",
            {
                "json": BulkDeactivateClubsInternalRequest(["club-1"]).to_json(),
                "headers": {"Authorization": "Bearer test"},
            },
        )

    asyncio.run(scenario())


def test_generated_club_client_preserves_routes_auth_and_multipart_json() -> None:
    """Exercise the generated async HTTPX client through the scraper adapter."""

    async def scenario() -> None:
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            status = 201 if request.method == "POST" else 200
            payload = [_club_payload()] if request.method == "GET" else _club_payload()
            return httpx.Response(status, json=payload)

        session = RecordingSession([])
        api_client = build_club_api_client(_settings())
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        clients = BlockoutClients(
            session,
            _settings(),
            _tokens(),
            ClubApi(api_client),
            StatusApiStub(),
        )
        try:
            listed = await clients.get_all_clubs()
            created = await clients.create_club(_club())
            updated = await clients.update_club(_club())
        finally:
            await api_client.close()

        assert listed[0].raw_name == "RAW"
        assert created.postal_code == "75001"
        assert updated.logo_url == "logo.png"
        assert [(request.method, request.url.path) for request in requests] == [
            ("GET", "/api/v1/clubs"),
            ("POST", "/api/v1/clubs"),
            ("PUT", "/api/v1/clubs/club-1"),
        ]
        assert all(
            request.headers["authorization"] == "Bearer test" for request in requests
        )
        for request in requests[1:]:
            body = request.content.decode()
            assert 'name="data"' in body
            assert '"rawName": "RAW"' in body
            assert '"postalCode": "75001"' in body
            assert "raw_name" not in body

    asyncio.run(scenario())


def test_generated_club_client_errors_keep_the_existing_adapter_semantics() -> None:
    """Translate generated HTTP errors without leaking the client implementation."""

    async def scenario() -> None:
        def handler(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                409,
                json={
                    "type": "about:blank",
                    "title": "Conflict",
                    "status": 409,
                    "detail": "conflict",
                    "code": "club_conflict",
                },
            )

        api_client = build_club_api_client(_settings())
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        clients = BlockoutClients(
            RecordingSession([]),
            _settings(),
            _tokens(),
            ClubApi(api_client),
            StatusApiStub(),
        )
        try:
            with pytest.raises(RuntimeError, match="Erreur API 409"):
                await clients.update_club(_club())
        finally:
            await api_client.close()

    asyncio.run(scenario())


def test_generated_config_client_preserves_status_route_and_auth() -> None:
    """Exercise the generated config client used by the Club scraper gate."""

    async def scenario() -> None:
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                200,
                json={
                    "id": 1,
                    "name": "SCRAPER_CLUBS",
                    "enabled": True,
                    "lastUpdate": "2026-07-20T12:00:00",
                },
            )

        api_client = build_config_api_client(_settings())
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        clients = BlockoutClients(
            RecordingSession([]),
            _settings(),
            _tokens(),
            object(),
            ScraperStatusApi(api_client),
        )
        try:
            assert await clients.scraper_enabled(ScraperNameEnum.SCRAPER_CLUBS)
        finally:
            await api_client.close()

        assert requests[0].url.path == ("/api/v1/config/scrapers/SCRAPER_CLUBS/status")
        assert requests[0].headers["authorization"] == "Bearer test"

    asyncio.run(scenario())


def test_response_reader_preserves_no_content_and_error_semantics() -> None:
    """Protect remaining aiohttp calls while their contracts are not migrated."""
    assert asyncio.run(read_json(RecordingResponse(status=204))) is None

    with pytest.raises(RuntimeError, match="Erreur API 409: conflict"):
        asyncio.run(
            read_json(RecordingResponse(status=409, payload={"message": "conflict"}))
        )
