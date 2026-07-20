import asyncio
import json
from dataclasses import fields
from datetime import datetime
from typing import get_type_hints

import pytest
from club_scraper.config.settings import Settings
from club_scraper.infrastructure.blockout.auth import TokenStore
from club_scraper.infrastructure.blockout.clients import BlockoutClients
from club_scraper.infrastructure.blockout.contracts import (
    BulkDeactivateClubsInternalRequest,
    ClubInternalResponse,
    CreateClubInternalRequest,
    ScraperName,
    ScraperStatusInternalResponse,
    UpdateClubInternalRequest,
)
from club_scraper.infrastructure.blockout.response import read_json


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
    """Record internal HTTP operations without network access."""

    def __init__(self, responses) -> None:
        self.responses = list(responses)
        self.calls: list[tuple] = []

    async def get(self, url, **kwargs):
        self.calls.append(("GET", url, kwargs))
        return self.responses.pop(0)

    async def post(self, url, **kwargs):
        self.calls.append(("POST", url, kwargs))
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


def test_club_internal_response_matches_the_java_owner_field_set() -> None:
    """Protect the exact clubs-service complete response mirror."""
    assert [field.name for field in fields(ClubInternalResponse)] == [
        "id",
        "rawName",
        "name",
        "address",
        "city",
        "postalCode",
        "email",
        "phoneNumber",
        "website",
        "logoUrl",
        "active",
        "latitude",
        "longitude",
        "createdAt",
        "lastUpdate",
    ]


def test_club_requests_match_the_java_owner_field_sets() -> None:
    """Protect exact create and update request names and order."""
    assert [field.name for field in fields(CreateClubInternalRequest)] == [
        "id",
        "rawName",
        "name",
        "address",
        "city",
        "postalCode",
        "email",
        "phoneNumber",
        "website",
        "logoUrl",
    ]
    assert [field.name for field in fields(UpdateClubInternalRequest)] == [
        "rawName",
        "name",
        "address",
        "city",
        "postalCode",
        "email",
        "phoneNumber",
        "website",
        "logoUrl",
    ]


def test_internal_contract_types_match_the_java_owner_types_and_nullability() -> None:
    """Protect primitive, nullable, timestamp, enum, and collection mirrors."""
    assert get_type_hints(ClubInternalResponse) == {
        "id": str,
        "rawName": str,
        "name": str,
        "address": str | None,
        "city": str | None,
        "postalCode": str | None,
        "email": str | None,
        "phoneNumber": str | None,
        "website": str | None,
        "logoUrl": str | None,
        "active": bool,
        "latitude": float | None,
        "longitude": float | None,
        "createdAt": datetime | None,
        "lastUpdate": datetime | None,
    }
    assert get_type_hints(ScraperStatusInternalResponse) == {
        "id": int,
        "name": ScraperName,
        "enabled": bool,
        "lastUpdate": datetime,
    }
    assert get_type_hints(BulkDeactivateClubsInternalRequest) == {
        "missingClubIds": list[str]
    }


def test_internal_response_reads_owner_fields_and_timestamps() -> None:
    """Protect native camelCase response decoding and owner-managed fields."""
    club = ClubInternalResponse.from_json(_club_payload())

    assert club.id == "club-1"
    assert club.createdAt == datetime.fromisoformat("2026-07-20T12:00:00")
    assert club.lastUpdate == datetime.fromisoformat("2026-07-20T13:00:00")
    assert club.active is True


def test_scraper_status_mirror_matches_config_service() -> None:
    """Protect config-service field names and contract-owned enum values."""
    assert [field.name for field in fields(ScraperStatusInternalResponse)] == [
        "id",
        "name",
        "enabled",
        "lastUpdate",
    ]
    assert set(ScraperName) == {ScraperName.SCRAPER, ScraperName.SCRAPER_CLUBS}


def test_clients_use_exact_internal_routes_and_authorization() -> None:
    """Protect the team projection, status, and bulk-deactivation operations."""

    async def scenario() -> None:
        status = {
            "id": 1,
            "name": "SCRAPER_CLUBS",
            "enabled": True,
            "lastUpdate": "2026-07-20T12:00:00",
        }
        session = RecordingSession(
            [
                RecordingResponse(payload=["club-1"]),
                RecordingResponse(payload=status),
                RecordingResponse(status=204),
            ]
        )
        clients = BlockoutClients(session, _settings(), _tokens())

        assert await clients.get_unique_club_ids() == ["club-1"]
        assert (await clients.get_scraper_status("SCRAPER_CLUBS")).enabled is True
        await clients.bulk_deactivate_clubs({"club-1"})

        assert session.calls[0] == (
            "GET",
            "http://teams.local/api/v1/teams/club-ids",
            {"headers": {"Authorization": "Bearer test"}},
        )
        assert session.calls[1][1] == (
            "http://config.local/api/v1/config/scrapers/SCRAPER_CLUBS/status"
        )
        assert session.calls[2] == (
            "PUT",
            "http://competition.local/api/v1/competitions/clubs/bulk-deactivate",
            {
                "json": BulkDeactivateClubsInternalRequest(["club-1"]).to_json(),
                "headers": {"Authorization": "Bearer test"},
            },
        )

    asyncio.run(scenario())


def test_client_writes_native_camel_case_multipart_requests() -> None:
    """Protect exact typed request serialization at the clubs-service boundary."""

    async def scenario() -> None:
        response = RecordingResponse(payload=_club_payload())
        session = RecordingSession([response, response])
        clients = BlockoutClients(session, _settings(), _tokens())
        create = CreateClubInternalRequest(
            id="club-1",
            rawName="RAW",
            name="Club",
            address=None,
            city="Paris",
            postalCode="75001",
            email=None,
            phoneNumber=None,
            website=None,
            logoUrl="logo.png",
        )
        update = UpdateClubInternalRequest(
            rawName="RAW",
            name="Club",
            address=None,
            city="Paris",
            postalCode="75001",
            email=None,
            phoneNumber=None,
            website=None,
            logoUrl="logo.png",
        )

        club = ClubInternalResponse.from_json(_club_payload())
        await clients.create_club(club)
        await clients.update_club(club)

        create_form = session.calls[0][2]["data"]
        update_form = session.calls[1][2]["data"]
        assert json.loads(create_form._fields[0][2]) == create.to_json()
        assert json.loads(update_form._fields[0][2]) == update.to_json()

    asyncio.run(scenario())


def test_response_reader_preserves_no_content_and_error_semantics() -> None:
    """Protect HTTP 204 and owner error propagation."""
    assert asyncio.run(read_json(RecordingResponse(status=204))) is None

    with pytest.raises(RuntimeError, match="Erreur API 409: conflict"):
        asyncio.run(
            read_json(RecordingResponse(status=409, payload={"message": "conflict"}))
        )
