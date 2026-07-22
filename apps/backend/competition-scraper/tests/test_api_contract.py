import asyncio
import json
from datetime import UTC, datetime
from urllib.parse import parse_qs

import httpx
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.config.api.scraper_status_api import ScraperStatusApi
from blockout_contract_clients.config.models.scraper_name_enum import ScraperNameEnum
from blockout_contract_clients.team.api.team_api import TeamApi
from scraper.application.models import RawDivisionMapping, Team
from scraper.infrastructure.blockout import competitions as competitions_api
from scraper.infrastructure.blockout import configuration as config_api
from scraper.infrastructure.blockout import matches as matches_api
from scraper.infrastructure.blockout import pools as pools_api
from scraper.infrastructure.blockout import teams as teams_api
from scraper.infrastructure.blockout.association_stats import (
    UpdateAssociationStatsInternalRequest,
)
from scraper.infrastructure.blockout.competition_association import (
    CompetitionAssociationInternalResponse,
)
from scraper.infrastructure.blockout.match import MatchInternalResponse
from scraper.infrastructure.blockout.pool import PoolInternalResponse
from scraper.infrastructure.blockout.response import convert_to_dataclass


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
        monkeypatch.setattr(
            config_api, "CONFIG_API_URL", "http://config.local/api/v1/config"
        )
        monkeypatch.setattr(
            config_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                200,
                json={
                    "id": 1,
                    "name": "SCRAPER",
                    "enabled": True,
                    "lastUpdate": "2026-07-19T12:30:00",
                },
            )

        api_client = config_api.build_config_api_client()
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        try:
            status = await config_api.get_scraper_status(
                ScraperStatusApi(api_client), ScraperNameEnum.SCRAPER
            )
        finally:
            await api_client.close()

        assert status.enabled is True
        assert requests[0].url.path == "/api/v1/config/scrapers/SCRAPER/status"
        assert requests[0].headers["authorization"] == "Bearer test"

    asyncio.run(scenario())


def test_writes_the_camel_case_team_payload(monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            teams_api, "TEAM_API_URL", "http://teams.local/api/v1/teams"
        )
        monkeypatch.setattr(
            teams_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                201 if request.method == "POST" else 200,
                json={
                    "id": 1,
                    "clubId": "club-1",
                    "rawName": "RAW TEAM",
                    "name": "Blockout",
                    "shortName": "BO",
                    "leagueCode": "LNV",
                    "divisionId": 10,
                    "season": "2026/2027",
                    "format": "SIX",
                    "gender": "F",
                    "followersCount": 0,
                    "logoUrl": None,
                    "active": True,
                },
            )

        team = Team(
            club_id="club-1",
            raw_name="RAW TEAM",
            name="Blockout",
            short_name="BO",
            league_code="LNV",
            division_id=10,
            season="2026/2027",
            format="SIX",
            gender="F",
        )

        api_client = teams_api.build_team_api_client()
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        try:
            created = await teams_api.create_team(TeamApi(api_client), team)
            team.id = created.id
            await teams_api.update_team(TeamApi(api_client), team)
        finally:
            await api_client.close()

        payload = json.loads(requests[0].content)
        assert requests[0].method == "POST"
        assert requests[0].url.path == "/api/v1/teams"
        assert payload["clubId"] == "club-1"
        assert payload["rawName"] == "RAW TEAM"
        assert payload["shortName"] == "BO"
        assert payload["divisionId"] == 10
        assert payload["followersCount"] == 0
        assert "createdAt" not in payload
        assert "club_id" not in payload
        assert created.raw_name == "RAW TEAM"
        assert requests[1].method == "PUT"
        update_payload = json.loads(parse_qs(requests[1].content.decode())["data"][0])
        assert update_payload["clubId"] == "club-1"
        assert "club_id" not in update_payload

    asyncio.run(scenario())


def test_writes_only_the_pool_creation_boundary(monkeypatch):
    async def scenario():
        monkeypatch.setattr(pools_api, "POOL_API_URL", "http://pools.local/v1/pools")
        monkeypatch.setattr(
            pools_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        session = RecordingSession()
        pool = PoolInternalResponse(
            "A",
            "LNV",
            "2026/2027",
            10,
            "League",
            "RAW",
            "Pool",
            "P",
            "SIX",
            "F",
        )

        await pools_api.create_pool.__wrapped__(session, pool)

        payload = session.calls[0][2]["json"]
        assert set(payload) == set(pools_api.POOL_CREATE_WRITE_FIELDS)
        assert payload["followersCount"] == 0
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

    match = convert_to_dataclass(payload, MatchInternalResponse)
    write_payload = matches_api._to_match_create_payload(match)

    assert set(payload) == set(MatchInternalResponse.__dataclass_fields__)
    assert match.matchDate == datetime(2026, 7, 19, 12, 30, tzinfo=UTC)
    assert set(write_payload) == {
        "matchCode",
        "leagueCode",
        "poolId",
        "liveCode",
        "teamIdA",
        "teamIdB",
        "matchDate",
        "season",
        "set",
        "score",
        "venue",
        "firstReferee",
        "secondReferee",
        "active",
    }
    assert "id" not in write_payload
    assert "createdAt" not in write_payload


def test_sends_native_camel_case_query_parameters(monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            teams_api, "TEAM_API_URL", "http://teams.local/api/v1/teams"
        )
        monkeypatch.setattr(
            teams_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(200, json=[])

        api_client = teams_api.build_team_api_client()
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        try:
            await teams_api.get_teams(
                TeamApi(api_client), division_id=10, club_id="club-1"
            )
        finally:
            await api_client.close()

        assert requests[0].method == "GET"
        assert requests[0].url.path == "/api/v1/teams"
        assert dict(requests[0].url.params) == {
            "divisionId": "10",
            "clubId": "club-1",
        }

    asyncio.run(scenario())


def test_generated_config_client_reads_and_writes_raw_division_mapping(monkeypatch):
    async def scenario() -> None:
        monkeypatch.setattr(
            config_api, "CONFIG_API_URL", "http://config.local/api/v1/config"
        )
        monkeypatch.setattr(
            config_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                201,
                json={
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
            )

        api_client = config_api.build_config_api_client()
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        try:
            mapping = await config_api.create_raw_division_mapping(
                RawDivisionMappingApi(api_client),
                RawDivisionMapping(
                    raw_division_name="N3",
                    division_id=7,
                    format="SIX",
                    gender="F",
                    league_code="LNV",
                    season="2026/2027",
                ),
            )
        finally:
            await api_client.close()

        payload = json.loads(requests[0].content)
        assert mapping.mapped is True
        assert mapping.raw_division_name == "N3"
        assert payload == {
            "rawDivisionName": "N3",
            "divisionId": 7,
            "format": "SIX",
            "gender": "F",
            "leagueCode": "LNV",
            "season": "2026/2027",
        }

    asyncio.run(scenario())


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

    association = convert_to_dataclass(payload, CompetitionAssociationInternalResponse)

    assert set(payload) == set(
        CompetitionAssociationInternalResponse.__dataclass_fields__
    )
    assert association.clubId == "club-1"
    assert association.createdAt.isoformat() == "2026-07-19T12:30:00"


def test_writes_only_the_competition_stats_boundary(monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            competitions_api, "COMPETITION_API_URL", "http://competition.local/v1"
        )
        monkeypatch.setattr(
            competitions_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        session = RecordingSession()
        stats = UpdateAssociationStatsInternalRequest(
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

        await competitions_api.update_team_association_stats.__wrapped__(
            session, 10, 20, stats
        )

        method, url, kwargs = session.calls[0]
        assert method == "PUT"
        assert url == "http://competition.local/v1/pools/10/teams/20/stats"
        assert set(kwargs["json"]) == set(
            competitions_api.ASSOCIATION_STATS_WRITE_FIELDS
        )
        assert kwargs["json"]["winsThreeToZero"] == 1
        assert "wins_three_to_zero" not in kwargs["json"]

    asyncio.run(scenario())
