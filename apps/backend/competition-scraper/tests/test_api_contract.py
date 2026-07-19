import asyncio
from datetime import datetime, timezone

import pytest

from api import competitions_api, config_api, matches_api, pools_api, teams_api
from models.association_stats import AssociationStats
from models.competition_association import CompetitionAssociation
from models.scraper_status import ScraperStatus
from models.raw_division_mapping import RawDivisionMapping
from models.team import Team
from models.pool import Pool
from models.match import Match
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

    async def put(self, url, **kwargs):
        self.calls.append(("PUT", url, kwargs))
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
            divisionId=10,
            season="2026/2027",
        )

        await teams_api.create_team.__wrapped__(session, team)

        method, url, kwargs = session.calls[0]
        assert method == "POST"
        assert url == "http://teams.local/v1/teams"
        assert kwargs["json"]["clubId"] == "club-1"
        assert kwargs["json"]["rawName"] == "RAW TEAM"
        assert kwargs["json"]["shortName"] == "BO"
        assert kwargs["json"]["divisionId"] == 10
        assert kwargs["json"]["logoUrl"] is None
        assert set(kwargs["json"]) == set(teams_api.TEAM_WRITE_FIELDS)
        assert "createdAt" not in kwargs["json"]
        assert "club_id" not in kwargs["json"]

    asyncio.run(scenario())


def test_writes_only_the_pool_creation_boundary(monkeypatch):
    async def scenario():
        monkeypatch.setattr(pools_api, "POOL_API_URL", "http://pools.local/v1/pools")
        monkeypatch.setattr(pools_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession()
        pool = Pool("A", "LNV", "2026/2027", 10, "League", "RAW", "Pool", "P", "SIX", "F")

        await pools_api.create_pool.__wrapped__(session, pool)

        payload = session.calls[0][2]["json"]
        assert set(payload) == set(pools_api.POOL_WRITE_FIELDS)
        assert payload["divisionId"] == 10
        assert "createdAt" not in payload

    asyncio.run(scenario())


def test_reads_the_complete_match_contract_and_writes_only_create_fields():
    payload = {
        "id": 1,
        "matchCode": "M1",
        "leagueCode": "L1",
        "poolId": 2,
        "liveCode": 3,
        "teamIdA": 4,
        "teamIdB": 5,
        "matchDate": "2026-07-19T12:30:00+00:00",
        "season": "2026",
        "set": "3-0",
        "score": "75-60",
        "status": "FINISHED",
        "venue": "Gym",
        "firstReferee": "Ref A",
        "secondReferee": "Ref B",
        "active": True,
        "createdAt": "2026-07-19T12:30:00+00:00",
        "lastUpdate": "2026-07-19T12:30:00+00:00",
        "liveUrl": "https://youtube.com/live/1",
        "liveProvider": "YOUTUBE",
        "liveOwnerAuth0Id": "auth0|1",
    }

    match = convert_to_dataclass(payload, Match)
    write_payload = matches_api._to_match_write_payload(match, matches_api.MATCH_CREATE_WRITE_FIELDS)

    assert set(payload) == set(Match.__dataclass_fields__)
    assert match.matchDate == datetime(2026, 7, 19, 12, 30, tzinfo=timezone.utc)
    assert set(write_payload) == set(matches_api.MATCH_CREATE_WRITE_FIELDS)
    assert "id" not in write_payload
    assert "createdAt" not in write_payload


def test_sends_native_camel_case_query_parameters(monkeypatch):
    async def scenario():
        monkeypatch.setattr(teams_api, "TEAM_API_URL", "http://teams.local/v1/teams")
        monkeypatch.setattr(teams_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession()

        await teams_api.get_teams.__wrapped__(session, divisionId=10, clubId="club-1")

        method, url, kwargs = session.calls[0]
        assert method == "GET"
        assert url == "http://teams.local/v1/teams"
        assert kwargs["params"] == {"divisionId": 10, "clubId": "club-1"}

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


def test_reads_the_complete_competition_association_contract():
    payload = {
        "id": 1,
        "poolId": 2,
        "teamId": 3,
        "clubId": "club-1",
        "active": True,
        "points": 9,
        "played": 3,
        "wins": 3,
        "losses": 0,
        "winsThreeToZero": 1,
        "winsThreeToOne": 1,
        "winsThreeToTwo": 1,
        "lossesZeroToThree": 0,
        "lossesOneToThree": 0,
        "lossesTwoToThree": 0,
        "wonSets": 9,
        "lostSets": 3,
        "wonPoints": 250,
        "lostPoints": 210,
        "pointsPenalty": 0,
        "coefSets": 3.0,
        "coefPoints": 1.19,
        "createdAt": "2026-07-19T12:30:00",
        "lastUpdate": "2026-07-19T12:30:00",
    }

    association = convert_to_dataclass(payload, CompetitionAssociation)

    assert set(payload) == set(CompetitionAssociation.__dataclass_fields__)
    assert association.clubId == "club-1"
    assert association.createdAt.isoformat() == "2026-07-19T12:30:00"


def test_writes_only_the_competition_stats_boundary(monkeypatch):
    async def scenario():
        monkeypatch.setattr(competitions_api, "COMPETITION_API_URL", "http://competition.local/v1")
        monkeypatch.setattr(competitions_api, "_get_headers", lambda: {"Authorization": "Bearer test"})
        session = RecordingSession()
        stats = AssociationStats(
            played=3,
            wins=2,
            losses=1,
            points=7,
            winsThreeToZero=1,
            winsThreeToOne=1,
            winsThreeToTwo=0,
            lossesZeroToThree=0,
            lossesOneToThree=1,
            lossesTwoToThree=0,
            wonSets=7,
            lostSets=4,
            wonPoints=240,
            lostPoints=220,
            pointsPenalty=0,
            coefSets=1.75,
            coefPoints=1.09,
        )

        await competitions_api.update_team_association_stats.__wrapped__(session, 10, 20, stats)

        method, url, kwargs = session.calls[0]
        assert method == "PUT"
        assert url == "http://competition.local/v1/pools/10/teams/20/stats"
        assert set(kwargs["json"]) == set(competitions_api.ASSOCIATION_STATS_WRITE_FIELDS)
        assert kwargs["json"]["winsThreeToZero"] == 1
        assert "wins_three_to_zero" not in kwargs["json"]

    asyncio.run(scenario())
