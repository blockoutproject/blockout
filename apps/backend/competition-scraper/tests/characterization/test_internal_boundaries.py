import asyncio
from dataclasses import fields, replace
from datetime import UTC, datetime

import scraper.application.match_changes as match_changes
from blockout_contract_clients.config.models.create_raw_division_mapping_internal_request import (
    CreateRawDivisionMappingInternalRequest,
)
from blockout_contract_clients.config.models.scraper_status_internal_response import (
    ScraperStatusInternalResponse,
)
from blockout_contract_clients.team.models.create_team_internal_request import (
    CreateTeamInternalRequest,
)
from blockout_contract_clients.team.models.update_team_internal_request import (
    UpdateTeamInternalRequest,
)
from scraper.application import pool_writer as pools_service
from scraper.application import team_writer as teams_service
from scraper.application.models import (
    AssociationStats,
    CompetitionAssociation,
    Pool,
    RawDivisionMapping,
    Team,
)
from scraper.application.source import Scraper
from scraper.domain.data_source_priority import DataSourcePriority
from scraper.infrastructure.blockout import matches as matches_api
from scraper.infrastructure.blockout.match import (
    BulkMatchesDeactivateInternalRequest,
    CreateMatchInternalRequest,
    MatchInternalResponse,
    UpdateMatchInternalRequest,
)
from scraper.infrastructure.blockout.response import process_response


class RecordingResponse:
    def __init__(self, status=204, payload=None, url="http://owner.invalid") -> None:
        self.status = status
        self.payload = payload
        self.url = url
        self.content_type = "application/json"
        self.headers = {"Content-Type": "application/json"}

    async def json(self):
        return self.payload

    async def text(self):
        return ""


class RecordingSession:
    def __init__(self) -> None:
        self.calls: list[tuple] = []

    async def put(self, url, **kwargs):
        self.calls.append(("PUT", url, kwargs))
        return RecordingResponse(url=url)


class DummyScraper(Scraper):
    async def run_scraping(self) -> None:
        return None


def _pool(**overrides) -> Pool:
    values = {
        "id": 10,
        "pool_code": "R1M",
        "league_code": "LNAQ",
        "season": "2026/2027",
        "division_id": 7,
        "league_name": "League",
        "raw_name": "Raw Pool",
        "name": "Pool",
        "short_name": "P",
        "format": "SIX",
        "gender": "M",
    }
    values.update(overrides)
    return Pool(**values)


def _team(**overrides) -> Team:
    values = {
        "id": 20,
        "club_id": "club-1",
        "raw_name": "Raw Team",
        "name": "Team",
        "short_name": "T",
        "league_code": "LNAQ",
        "division_id": 7,
        "season": "2026/2027",
        "format": "SIX",
        "gender": "M",
    }
    values.update(overrides)
    return Team(**values)


def _match(**overrides) -> MatchInternalResponse:
    values = {
        "id": 30,
        "matchCode": "M001",
        "leagueCode": "LNAQ",
        "poolId": 10,
        "teamIdA": 20,
        "teamIdB": 21,
        "matchDate": datetime(2026, 10, 4, 16, 30, tzinfo=UTC),
        "season": "2026/2027",
    }
    values.update(overrides)
    return MatchInternalResponse(**values)


def test_complete_transport_mirrors_match_java_owner_field_sets() -> None:
    """Protect every complete owner mirror before later contract generation."""
    assert [item.name for item in fields(Team)] == [
        "club_id",
        "raw_name",
        "name",
        "short_name",
        "league_code",
        "division_id",
        "season",
        "gender",
        "format",
        "id",
        "followers_count",
        "logo_url",
        "active",
        "created_at",
        "last_update",
    ]
    assert set(item.name for item in fields(Pool)) == {
        "id",
        "pool_code",
        "league_code",
        "season",
        "division_id",
        "league_name",
        "raw_name",
        "name",
        "short_name",
        "format",
        "gender",
        "followers_count",
        "active",
        "created_at",
        "last_update",
    }
    assert set(item.name for item in fields(MatchInternalResponse)) == {
        "id",
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
        "status",
        "venue",
        "firstReferee",
        "secondReferee",
        "active",
        "createdAt",
        "lastUpdate",
        "liveUrl",
        "liveProvider",
        "liveOwnerAuth0Id",
    }
    assert set(item.name for item in fields(CompetitionAssociation)) == {
        "id",
        "pool_id",
        "team_id",
        "club_id",
        "active",
        "points",
        "played",
        "wins",
        "losses",
        "wins_three_to_zero",
        "wins_three_to_one",
        "wins_three_to_two",
        "losses_zero_to_three",
        "losses_one_to_three",
        "losses_two_to_three",
        "won_sets",
        "lost_sets",
        "won_points",
        "lost_points",
        "points_penalty",
        "coefficient_sets",
        "coefficient_points",
        "created_at",
        "last_update",
    }
    assert set(item.name for item in fields(RawDivisionMapping)) == {
        "id",
        "raw_division_name",
        "division_id",
        "format",
        "gender",
        "league_code",
        "season",
        "created_at",
        "last_update",
        "mapped",
    }
    assert list(ScraperStatusInternalResponse.model_fields) == [
        "id",
        "name",
        "enabled",
        "last_update",
    ]


def test_write_contracts_mirror_java_owner_field_sets() -> None:
    """Protect every handwritten request until shared generation replaces it."""
    assert list(CreateTeamInternalRequest.model_fields) == [
        "club_id",
        "raw_name",
        "name",
        "short_name",
        "league_code",
        "division_id",
        "season",
        "format",
        "gender",
        "followers_count",
        "logo_url",
        "active",
    ]
    assert list(UpdateTeamInternalRequest.model_fields) == [
        "club_id",
        "raw_name",
        "name",
        "short_name",
        "league_code",
        "division_id",
        "logo_url",
        "season",
        "format",
        "gender",
        "active",
    ]
    match_write_fields = [
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
    ]
    assert [item.name for item in fields(CreateMatchInternalRequest)] == [
        *match_write_fields,
        "active",
    ]
    assert [item.name for item in fields(UpdateMatchInternalRequest)] == (
        match_write_fields
    )
    assert [
        field.alias or name
        for name, field in CreateRawDivisionMappingInternalRequest.model_fields.items()
    ] == [
        "rawDivisionName",
        "divisionId",
        "format",
        "gender",
        "leagueCode",
        "season",
    ]
    assert [item.name for item in fields(BulkMatchesDeactivateInternalRequest)] == [
        "missingMatchCodes"
    ]
    assert {item.name for item in fields(AssociationStats)} == {
        "played",
        "wins",
        "losses",
        "points",
        "wins_three_to_zero",
        "wins_three_to_one",
        "wins_three_to_two",
        "losses_zero_to_three",
        "losses_one_to_three",
        "losses_two_to_three",
        "won_sets",
        "lost_sets",
        "won_points",
        "lost_points",
        "points_penalty",
        "coefficient_sets",
        "coefficient_points",
    }


def test_match_bulk_cleanup_uses_native_camel_case_request(monkeypatch) -> None:
    """Protect the remaining handwritten Match cleanup command."""

    async def scenario() -> None:
        session = RecordingSession()
        monkeypatch.setattr(
            matches_api, "MATCH_API_URL", "http://matches.local/v1/matches"
        )
        monkeypatch.setattr(
            matches_api, "_get_headers", lambda: {"Authorization": "Bearer test"}
        )

        await matches_api.bulk_deactivate_matches.__wrapped__(session, 10, {"M001"})

        assert session.calls == [
            (
                "PUT",
                "http://matches.local/v1/matches/pools/10/bulk-deactivate",
                {
                    "json": {"missingMatchCodes": ["M001"]},
                    "headers": {"Authorization": "Bearer test"},
                },
            ),
        ]

    asyncio.run(scenario())


def test_pool_and_team_decisions_preserve_identity_noop_and_reactivation(
    monkeypatch,
) -> None:
    """Protect create/update/no-op decisions at owner boundaries."""

    async def scenario() -> None:
        pool_updates: list[tuple] = []
        team_updates: list[tuple] = []

        async def update_pool(_session, candidate, changes):
            pool_updates.append((candidate, changes))
            return candidate

        async def update_team(_session, candidate, changes):
            team_updates.append((candidate, changes))
            return candidate

        monkeypatch.setattr(pools_service, "update_pool", update_pool)
        monkeypatch.setattr(teams_service, "update_team", update_team)

        current_pool = _pool(active=False)
        pool_candidate = _pool(id=999, raw_name="Changed", active=False)
        await pools_service.add_or_update_pool(None, pool_candidate, current_pool)
        assert pool_candidate.id == 10
        assert pool_candidate.active is True
        assert any("Pool réactivée" in change for change in pool_updates[0][1])

        current_team = _team(active=False)
        team_candidate = _team(id=999, raw_name="Changed", active=False)
        await teams_service.add_or_update_team(None, team_candidate, current_team)
        assert team_candidate.id == 20
        assert team_candidate.active is True
        assert any("réactivée" in change for change in team_updates[0][1])

        pool_updates.clear()
        team_updates.clear()
        assert await pools_service.add_or_update_pool(
            None, replace(current_pool, active=True), replace(current_pool, active=True)
        )
        assert await teams_service.add_or_update_team(
            None, replace(current_team, active=True), replace(current_team, active=True)
        )
        assert pool_updates == []
        assert team_updates == []

    asyncio.run(scenario())


def test_match_finalization_creates_updates_skips_and_isolates_failures(
    monkeypatch,
) -> None:
    """Protect per-match write decisions, failure isolation, and cache clearing."""

    async def scenario() -> None:
        creates: list[str] = []
        updates: list[str] = []

        async def create(_session, match):
            creates.append(match.matchCode)
            if match.matchCode == "FAIL":
                raise RuntimeError("owner failure")

        async def update(_session, match, _changes):
            updates.append(match.matchCode)

        monkeypatch.setattr(match_changes, "create_match", create)
        monkeypatch.setattr(match_changes, "update_match", update)
        monkeypatch.setattr(match_changes, "log_event", lambda **_event: None)
        scraper = DummyScraper(None, None, "finalize")
        existing = _match(matchCode="UPDATE")
        unchanged = _match(matchCode="NOOP")
        scraper._matches_cache = {
            ("LNAQ", "CREATE"): (
                None,
                _match(matchCode="CREATE"),
                [],
                DataSourcePriority.FFVB,
            ),
            ("LNAQ", "FAIL"): (
                None,
                _match(matchCode="FAIL"),
                [],
                DataSourcePriority.FFVB,
            ),
            ("LNAQ", "UPDATE"): (
                existing,
                replace(existing, venue="New"),
                ["venue"],
                DataSourcePriority.FFVB,
            ),
            ("LNAQ", "NOOP"): (
                unchanged,
                replace(unchanged),
                [],
                DataSourcePriority.DB,
            ),
        }

        await scraper.finalize_matches_updates()

        assert creates == ["CREATE", "FAIL"]
        assert updates == ["UPDATE"]
        assert scraper._matches_cache == {}

    asyncio.run(scenario())


def test_response_handler_preserves_no_content_list_semantics() -> None:
    """Protect empty-list decoding used by owner collection clients."""
    result = asyncio.run(
        process_response(RecordingResponse(), list[Pool], "get_pools", (), {})
    )
    assert result == []
