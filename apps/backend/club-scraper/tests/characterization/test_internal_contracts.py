"""Characterize generated Blockout contracts used by Club ingestion."""

import asyncio
from datetime import datetime

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
from blockout_contract_clients.competition.api.competition_association_api import (
    CompetitionAssociationApi,
)
from blockout_contract_clients.config.api.scraper_status_api import ScraperStatusApi
from blockout_contract_clients.team.api.team_api import TeamApi
from scraper.config.settings import Settings
from scraper.domain.models import Club
from scraper.infrastructure.blockout.auth import TokenStore
from scraper.infrastructure.blockout.clients import (
    BlockoutClients,
    build_club_api_client,
    build_competition_api_client,
    build_config_api_client,
    build_team_api_client,
)


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


def test_generated_clients_own_every_blockout_route() -> None:
    """Protect routes, authorization, multipart JSON, and bulk bodies."""

    async def scenario() -> None:
        requests: list[httpx.Request] = []

        def respond(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            if request.url.path == "/api/v1/clubs":
                payload = (
                    [_club_payload()] if request.method == "GET" else _club_payload()
                )
                return httpx.Response(
                    200 if request.method == "GET" else 201, json=payload
                )
            if request.url.path == "/api/v1/clubs/club-1":
                return httpx.Response(200, json=_club_payload())
            if request.url.path == "/api/v1/teams/club-ids":
                return httpx.Response(200, json=["club-1"])
            if request.url.path.endswith("/scrapers/SCRAPER_CLUBS/status"):
                return httpx.Response(
                    200,
                    json={
                        "id": 1,
                        "name": "SCRAPER_CLUBS",
                        "enabled": True,
                        "lastUpdate": "2026-07-20T12:00:00",
                    },
                )
            return httpx.Response(200)

        api_clients = [
            build_club_api_client(_settings()),
            build_config_api_client(_settings()),
            build_team_api_client(_settings()),
            build_competition_api_client(_settings()),
        ]
        for api_client in api_clients:
            api_client.rest_client.pool_manager = httpx.AsyncClient(
                transport=httpx.MockTransport(respond)
            )
        clients = BlockoutClients(
            _tokens(),
            ClubApi(api_clients[0]),
            ScraperStatusApi(api_clients[1]),
            TeamApi(api_clients[2]),
            CompetitionAssociationApi(api_clients[3]),
        )

        try:
            assert (await clients.get_all_clubs())[0].raw_name == "RAW"
            assert await clients.get_unique_club_ids() == ["club-1"]
            assert await clients.scraper_enabled("SCRAPER_CLUBS") is True
            assert (await clients.create_club(_club())).postal_code == "75001"
            assert (await clients.update_club(_club())).logo_url == "logo.png"
            await clients.bulk_deactivate_clubs({"club-2", "club-1"})
        finally:
            for api_client in api_clients:
                await api_client.close()

        assert [(request.method, request.url.path) for request in requests] == [
            ("GET", "/api/v1/clubs"),
            ("GET", "/api/v1/teams/club-ids"),
            ("GET", "/api/v1/config/scrapers/SCRAPER_CLUBS/status"),
            ("POST", "/api/v1/clubs"),
            ("PUT", "/api/v1/clubs/club-1"),
            ("PUT", "/api/v1/competitions/clubs/bulk-deactivate"),
        ]
        assert all(
            request.headers["authorization"] == "Bearer test" for request in requests
        )
        assert '"missingClubIds":["club-1","club-2"]' in requests[-1].content.decode()
        for request in requests[3:5]:
            body = request.content.decode()
            assert 'name="data"' in body
            assert '"rawName": "RAW"' in body
            assert "raw_name" not in body

    asyncio.run(scenario())


def test_generated_client_errors_keep_adapter_semantics() -> None:
    """Translate generated HTTP errors without leaking client implementation."""

    async def scenario() -> None:
        def conflict(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(409, json={"message": "conflict"})

        api_client = build_club_api_client(_settings())
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(conflict)
        )
        clients = BlockoutClients(
            _tokens(),
            ClubApi(api_client),
            object(),
            object(),
            object(),
        )
        try:
            with pytest.raises(RuntimeError, match="Erreur API 409"):
                await clients.update_club(_club())
        finally:
            await api_client.close()

    asyncio.run(scenario())
