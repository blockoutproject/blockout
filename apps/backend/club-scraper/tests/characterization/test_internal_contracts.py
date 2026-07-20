import asyncio
from dataclasses import fields
from datetime import datetime

import pytest

from api import clubs_api, teams_api
from models.club import Club
from models.scraper_status import ScraperStatus
from utils.handlers.api_handler import convert_to_dataclass, process_response


class RecordingResponse:
    """Minimal aiohttp response double for internal client characterization."""

    def __init__(self, status=200, payload=None, content_type="application/json", text="") -> None:
        self.status = status
        self.payload = payload
        self.content_type = content_type
        self._text = text

    async def json(self):
        """Return the configured JSON body."""
        return self.payload

    async def text(self) -> str:
        """Return the configured text body."""
        return self._text


class RecordingSession:
    """Record internal HTTP operations without contacting a service."""

    def __init__(self, response) -> None:
        self.response = response
        self.calls: list[tuple] = []

    async def get(self, url, **kwargs):
        """Record an internal GET request."""
        self.calls.append(("GET", url, kwargs))
        return self.response


def test_club_internal_response_matches_the_java_owner_field_set() -> None:
    """Protect the handwritten Python mirror of clubs-service ClubInternalResponse."""
    assert [field.name for field in fields(Club)] == [
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


def test_club_write_payloads_match_the_java_owner_requests() -> None:
    """Protect exact CreateClubInternalRequest and UpdateClubInternalRequest fields."""
    club = Club(
        id="club-1",
        rawName="RAW",
        name="Club",
        address="1 Street",
        city="Paris",
        postalCode="75001",
        email="mail@example.invalid",
        phoneNumber="0102030405",
        website="https://club.example.invalid",
        logoUrl="logo.png",
        active=False,
        latitude=48.0,
        longitude=2.0,
    )

    assert list(clubs_api._create_payload(club)) == [
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
    assert list(clubs_api._update_payload(club)) == [
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


def test_internal_response_mapping_reads_the_complete_owner_resource() -> None:
    """Protect camelCase response decoding, timestamps, nullability, and owner-managed fields."""
    payload = {
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

    club = convert_to_dataclass(payload, Club)

    assert club.id == "club-1"
    assert club.createdAt == datetime.fromisoformat(payload["createdAt"])
    assert club.lastUpdate == datetime.fromisoformat(payload["lastUpdate"])
    assert club.active is True


def test_scraper_status_mirror_matches_config_service() -> None:
    """Protect the exact config-service ScraperStatus response mirror."""
    assert [field.name for field in fields(ScraperStatus)] == ["id", "name", "enabled", "lastUpdate"]


def test_teams_client_requests_the_owner_club_id_projection(monkeypatch) -> None:
    """Protect the exact teams-service projection route and authentication header."""
    async def scenario() -> None:
        monkeypatch.setattr(teams_api, "TEAM_API_URL", "http://teams.local/api/v1/teams")
        monkeypatch.setattr(teams_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession(RecordingResponse(payload=["club-1"]))

        result = await teams_api.get_unique_club_ids(session)

        assert result == ["club-1"]
        assert session.calls == [
            (
                "GET",
                "http://teams.local/api/v1/teams/club-ids",
                {"headers": {"Authorization": "Bearer test"}},
            )
        ]

    asyncio.run(scenario())


def test_response_handler_returns_an_empty_list_for_no_content() -> None:
    """Protect list-client semantics for owner responses with HTTP 204."""
    result = asyncio.run(process_response(RecordingResponse(status=204), list[Club]))

    assert result == []


def test_response_handler_raises_the_owner_error_message() -> None:
    """Protect internal API error propagation before the future client replacement."""
    response = RecordingResponse(status=409, payload={"message": "conflict"})

    with pytest.raises(Exception, match="Erreur API 409: conflict"):
        asyncio.run(process_response(response, Club))
