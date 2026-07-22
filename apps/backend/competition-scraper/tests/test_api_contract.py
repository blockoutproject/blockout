import asyncio
import json
from datetime import UTC, datetime
from urllib.parse import parse_qs

import httpx
from blockout_contract_clients.competition.api.competition_association_api import (
    CompetitionAssociationApi,
)
from blockout_contract_clients.competition.models.competition_association_internal_response import (
    CompetitionAssociationInternalResponse,
)
from blockout_contract_clients.config.api.raw_division_mapping_api import (
    RawDivisionMappingApi,
)
from blockout_contract_clients.config.api.scraper_status_api import ScraperStatusApi
from blockout_contract_clients.config.models.scraper_name_enum import ScraperNameEnum
from blockout_contract_clients.match.api.match_api import MatchApi
from blockout_contract_clients.pool.api.pool_api import PoolApi
from blockout_contract_clients.team.api.team_api import TeamApi
from scraper.domain.models import (
    AssociationStats,
    Match,
    Pool,
    RawDivisionMapping,
    Team,
)
from scraper.infrastructure.blockout import competitions as competitions_api
from scraper.infrastructure.blockout import configuration as config_api
from scraper.infrastructure.blockout import matches as matches_api
from scraper.infrastructure.blockout import pools as pools_api
from scraper.infrastructure.blockout import teams as teams_api


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
        monkeypatch.setattr(
            pools_api, "POOL_API_URL", "http://pools.local/api/v1/pools"
        )
        monkeypatch.setattr(
            pools_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                201,
                json={
                    "id": 1,
                    "poolCode": "A",
                    "leagueCode": "LNV",
                    "season": "2026/2027",
                    "leagueName": "League",
                    "rawName": "RAW",
                    "name": "Pool",
                    "shortName": "P",
                    "divisionId": 10,
                    "format": "SIX",
                    "gender": "F",
                    "followersCount": 0,
                    "active": True,
                },
            )

        pool = Pool(
            pool_code="A",
            league_code="LNV",
            season="2026/2027",
            division_id=10,
            league_name="League",
            raw_name="RAW",
            name="Pool",
            short_name="P",
            format="SIX",
            gender="F",
        )

        api_client = pools_api.build_pool_api_client()
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        try:
            created = await pools_api.create_pool(PoolApi(api_client), pool)
        finally:
            await api_client.close()

        payload = json.loads(requests[0].content)
        assert payload["followersCount"] == 0
        assert payload["divisionId"] == 10
        assert "createdAt" not in payload
        assert "division_id" not in payload
        assert created.pool_code == "A"

    asyncio.run(scenario())


def test_reads_and_writes_the_generated_match_contract(monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            matches_api, "MATCH_API_URL", "http://matches.local/api/v1/matches"
        )
        monkeypatch.setattr(
            matches_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        response_payload = {
            "id": 1,
            "matchCode": "M1",
            "leagueCode": "L1",
            "poolId": 2,
            "liveCode": 3,
            "teamIdA": 4,
            "teamIdB": 5,
            "matchDate": "2026-07-19T12:30:00Z",
            "season": "2026",
            "set": "3-0",
            "score": "75-60",
            "status": "FINISHED",
            "venue": "Gym",
            "firstReferee": "Ref A",
            "secondReferee": "Ref B",
            "active": True,
            "createdAt": "2026-07-19T12:30:00Z",
            "lastUpdate": "2026-07-19T12:30:00Z",
            "liveUrl": "https://youtube.com/live/1",
            "liveProvider": "YOUTUBE",
            "liveOwnerAuth0Id": "auth0|1",
        }
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(201, json=response_payload)

        api_client = matches_api.build_match_api_client()
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        try:
            created = await matches_api.create_match(
                MatchApi(api_client),
                Match(
                    match_code="M1",
                    league_code="L1",
                    pool_id=2,
                    live_code=3,
                    team_id_a=4,
                    team_id_b=5,
                    match_date=datetime(2026, 7, 19, 12, 30, tzinfo=UTC),
                    season="2026",
                    set="3-0",
                    score="75-60",
                    venue="Gym",
                    first_referee="Ref A",
                    second_referee="Ref B",
                ),
            )
        finally:
            await api_client.close()

        payload = json.loads(requests[0].content)
        assert payload["matchCode"] == "M1"
        assert datetime.fromisoformat(payload["matchDate"]) == datetime(
            2026, 7, 19, 12, 30, tzinfo=UTC
        )
        assert "createdAt" not in payload
        assert created.status == "FINISHED"
        assert created.live_provider == "YOUTUBE"

    asyncio.run(scenario())


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

    response = CompetitionAssociationInternalResponse.from_dict(payload)
    assert response is not None
    association = competitions_api._to_association(response)

    assert association.club_id == "club-1"
    assert association.created_at.isoformat() == "2026-07-19T12:30:00"


def test_writes_only_the_competition_stats_boundary(monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            competitions_api,
            "COMPETITION_API_URL",
            "http://competition.local/api/v1/competitions",
        )
        monkeypatch.setattr(
            competitions_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                200,
                json={
                    "id": 1,
                    "poolId": 10,
                    "teamId": 20,
                    "clubId": "club-1",
                    "active": True,
                },
            )

        stats = AssociationStats(
            played=3,
            wins=2,
            losses=1,
            points=7,
            wins_three_to_zero=1,
            wins_three_to_one=1,
            wins_three_to_two=0,
            losses_zero_to_three=0,
            losses_one_to_three=1,
            losses_two_to_three=0,
            won_sets=7,
            lost_sets=4,
            won_points=240,
            lost_points=220,
            points_penalty=0,
            coefficient_sets=1.75,
            coefficient_points=1.09,
        )

        api_client = competitions_api.build_competition_api_client()
        api_client.rest_client.pool_manager = httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        )
        try:
            await competitions_api.update_team_association_stats(
                CompetitionAssociationApi(api_client), 10, 20, stats
            )
        finally:
            await api_client.close()

        assert requests[0].method == "PUT"
        payload = json.loads(requests[0].content)
        assert payload["winsThreeToZero"] == 1
        assert "wins_three_to_zero" not in payload

    asyncio.run(scenario())
