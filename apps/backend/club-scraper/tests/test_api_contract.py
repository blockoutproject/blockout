import asyncio

import pytest

from api import competitions_api, config_api
from models.scraper_status import ScraperStatus
from utils.handlers.api_handler import convert_to_dataclass


class RecordingResponse:
    def __init__(self, status=204, payload=None):
        self.status = status
        self.content_type = "application/json"
        self.payload = payload

    async def json(self):
        return self.payload


class RecordingSession:
    def __init__(self, response):
        self.response = response
        self.calls = []

    async def get(self, url, **kwargs):
        self.calls.append(("GET", url, kwargs))
        return self.response

    async def put(self, url, **kwargs):
        self.calls.append(("PUT", url, kwargs))
        return self.response


def test_requests_scraper_status_from_the_config_api(monkeypatch):
    async def scenario():
        monkeypatch.setattr(config_api, "CONFIG_API_URL", "http://config.local/v1")
        monkeypatch.setattr(config_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession(RecordingResponse())

        await config_api.get_scraper_status.__wrapped__(session, "SCRAPER_CLUBS")

        assert session.calls == [(
            "GET",
            "http://config.local/v1/scrapers/SCRAPER_CLUBS/status",
            {"headers": {"Authorization": "Bearer test"}},
        )]

    asyncio.run(scenario())


def test_writes_the_current_snake_case_bulk_deactivation_payload(monkeypatch):
    async def scenario():
        monkeypatch.setattr(competitions_api, "COMPETITION_API_URL", "http://competition.local/v1")
        monkeypatch.setattr(competitions_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession(RecordingResponse())

        await competitions_api.bulk_deactivate_clubs.__wrapped__(session, {"club-1"})

        assert session.calls == [(
            "PUT",
            "http://competition.local/v1/clubs/bulk-deactivate",
            {
                "json": {"missing_club_ids": ["club-1"]},
                "headers": {"Authorization": "Bearer test"},
            },
        )]

    asyncio.run(scenario())


def test_current_status_mapping_drops_the_snake_case_timestamp():
    status = convert_to_dataclass(
        {
            "id": 1,
            "name": "SCRAPER_CLUBS",
            "enabled": True,
            "last_update": "2026-07-19T12:30:00",
        },
        ScraperStatus,
    )

    assert status.enabled is True
    assert status.lastUpdate is None
