import asyncio

import pytest

from api import config_api, teams_api
from models.scraper_status import ScraperStatus
from models.team import Team
from utils.handlers.api_handler import convert_to_dataclass


class RecordingResponse:
    pass


class RecordingSession:
    def __init__(self):
        self.calls = []

    async def get(self, url, **kwargs):
        self.calls.append(("GET", url, kwargs))
        return RecordingResponse()

    async def post(self, url, **kwargs):
        self.calls.append(("POST", url, kwargs))
        return RecordingResponse()


def test_requests_scraper_status_from_the_config_api(monkeypatch):
    async def scenario():
        monkeypatch.setattr(config_api, "CONFIG_API_URL", "http://config.local/v1")
        monkeypatch.setattr(config_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession()

        await config_api.get_scraper_status.__wrapped__(session, "SCRAPER")

        assert session.calls == [(
            "GET",
            "http://config.local/v1/scrapers/SCRAPER/status",
            {"headers": {"Authorization": "Bearer test"}},
        )]

    asyncio.run(scenario())


def test_writes_the_current_snake_case_team_payload(monkeypatch):
    async def scenario():
        monkeypatch.setattr(teams_api, "TEAM_API_URL", "http://teams.local/v1/teams")
        monkeypatch.setattr(teams_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession()
        team = Team(
            club_id="club-1",
            raw_name="RAW TEAM",
            name="Blockout",
            short_name="BO",
            league_code="LNV",
            division_id="10",
            season="2026/2027",
        )

        await teams_api.create_team.__wrapped__(session, team)

        method, url, kwargs = session.calls[0]
        assert method == "POST"
        assert url == "http://teams.local/v1/teams"
        assert kwargs["json"]["club_id"] == "club-1"
        assert kwargs["json"]["raw_name"] == "RAW TEAM"
        assert kwargs["json"]["short_name"] == "BO"
        assert kwargs["json"]["division_id"] == "10"
        assert "clubId" not in kwargs["json"]

    asyncio.run(scenario())


def test_current_status_mapping_drops_the_snake_case_timestamp():
    status = convert_to_dataclass(
        {
            "id": 1,
            "name": "SCRAPER",
            "enabled": True,
            "last_update": "2026-07-19T12:30:00",
        },
        ScraperStatus,
    )

    assert status.enabled is True
    assert status.lastUpdate is None
