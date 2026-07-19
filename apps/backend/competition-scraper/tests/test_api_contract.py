import asyncio

import pytest

from api import config_api, teams_api
from models.scraper_status import ScraperStatus
from models.raw_division_mapping import RawDivisionMapping
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


def test_writes_the_camel_case_team_payload(monkeypatch):
    async def scenario():
        monkeypatch.setattr(teams_api, "TEAM_API_URL", "http://teams.local/v1/teams")
        monkeypatch.setattr(teams_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession()
        team = Team(
            clubId="club-1",
            rawName="RAW TEAM",
            name="Blockout",
            shortName="BO",
            leagueCode="LNV",
            divisionId="10",
            season="2026/2027",
        )

        await teams_api.create_team.__wrapped__(session, team)

        method, url, kwargs = session.calls[0]
        assert method == "POST"
        assert url == "http://teams.local/v1/teams"
        assert kwargs["json"]["clubId"] == "club-1"
        assert kwargs["json"]["rawName"] == "RAW TEAM"
        assert kwargs["json"]["shortName"] == "BO"
        assert kwargs["json"]["divisionId"] == "10"
        assert "club_id" not in kwargs["json"]

    asyncio.run(scenario())


def test_sends_native_camel_case_query_parameters(monkeypatch):
    async def scenario():
        monkeypatch.setattr(teams_api, "TEAM_API_URL", "http://teams.local/v1/teams")
        monkeypatch.setattr(teams_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession()

        await teams_api.get_teams.__wrapped__(session, divisionId="10", clubId="club-1")

        method, url, kwargs = session.calls[0]
        assert method == "GET"
        assert url == "http://teams.local/v1/teams"
        assert kwargs["params"] == {"divisionId": "10", "clubId": "club-1"}

    asyncio.run(scenario())


def test_status_mapping_reads_the_camel_case_timestamp():
    status = convert_to_dataclass(
        {
            "id": 1,
            "name": "SCRAPER",
            "enabled": True,
            "lastUpdate": "2026-07-19T12:30:00",
        },
        ScraperStatus,
    )

    assert status.enabled is True
    assert status.lastUpdate.isoformat() == "2026-07-19T12:30:00"


def test_reads_and_writes_the_authoritative_raw_division_mapping_contract():
    mapping = convert_to_dataclass(
        {
            "id": 1,
            "rawDivisionName": "N3",
            "divisionId": 7,
            "format": "SIX",
            "gender": "F",
            "leagueCode": "LNV",
            "season": "2026/2027",
            "createdAt": "2026-07-19T12:30:00",
            "lastUpdate": "2026-07-19T12:30:00",
            "mapped": True,
        },
        RawDivisionMapping,
    )

    payload = config_api._create_raw_division_mapping_payload(mapping)

    assert mapping.mapped is True
    assert payload == {
        "rawDivisionName": "N3",
        "divisionId": 7,
        "format": "SIX",
        "gender": "F",
        "leagueCode": "LNV",
        "season": "2026/2027",
    }
