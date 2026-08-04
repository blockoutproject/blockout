import asyncio
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from scraper.application import calendar_ingestion as pipeline
from scraper.application.source import Scraper
from scraper.domain.models import Pool, Team
from scraper.infrastructure.ffvb import calendar as file_utils
from scraper.infrastructure.ffvb.calendar import download_and_parse_csv
from scraper.infrastructure.ffvb.models import (
    FfvbCalendarMatch,
    FfvbCalendarSnapshot,
    FfvbRanking,
)
from scraper.infrastructure.provider_http import ProviderHttpClient

FIXTURE = Path(__file__).parents[1] / "fixtures" / "ffvb" / "calendar.csv"


class _Content:
    async def read(self) -> bytes:
        return FIXTURE.read_bytes()


class _Response:
    status = 200
    headers = {"Content-Type": "text/csv"}
    content = _Content()

    def raise_for_status(self) -> None:
        return None


class _Context:
    def __init__(self, result) -> None:
        self.result = result

    async def __aenter__(self):
        if isinstance(self.result, BaseException):
            raise self.result
        return self.result

    async def __aexit__(self, *_args) -> None:
        return None


class _Session:
    def __init__(self, results=None) -> None:
        self.closed = False
        self.results = list(results or [_Response()])
        self.calls: list[tuple] = []

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return _Context(self.results.pop(0))


def _pool() -> Pool:
    return Pool(
        pool_code="R1M",
        league_code="LNAQ",
        season="2026/2027",
        division_id=7,
        league_name="Nouvelle Aquitaine",
        raw_name="Poule A",
        name="Poule A",
        short_name="Poule A",
        format="SIX",
        gender="M",
        id=10,
    )


def test_csv_download_preserves_post_shape_encoding_timeout_and_retries(
    monkeypatch,
) -> None:
    """Protect the FFVB export request and its independent retry policy."""

    async def scenario() -> None:
        attempts = 0
        calls: list[httpx.Request] = []
        sleeps: list[int] = []

        def respond(request: httpx.Request) -> httpx.Response:
            nonlocal attempts
            attempts += 1
            calls.append(request)
            if attempts < 3:
                raise httpx.ReadTimeout("provider timeout", request=request)
            return httpx.Response(
                200,
                content=FIXTURE.read_bytes(),
                headers={"Content-Type": "text/csv"},
            )

        async def sleep(delay: int) -> None:
            sleeps.append(delay)

        monkeypatch.setattr(file_utils.asyncio, "sleep", sleep)
        monkeypatch.setattr(file_utils, "log_event", lambda **_event: None)

        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            provider = ProviderHttpClient(client)
            scraper = type(
                "Scraper",
                (),
                {"post_provider_form": provider.post_form},
            )()
            snapshot = await download_and_parse_csv(scraper, _pool(), "2026/2027")

        assert snapshot.matches[0].match_code == "3MA001"
        assert attempts == 3
        request = calls[-1]
        assert str(request.url).endswith("vbspo_calendrier_export.php")
        assert request.content == (
            b"cal_saison=2026%2F2027&cal_codent=LNAQ&cal_codpoule=R1M"
        )
        assert request.extensions["timeout"]["read"] == 20
        assert sleeps == [5, 5]

    asyncio.run(scenario())


class RecordingScraper:
    """Record the complete CSV application trace."""

    def __init__(self) -> None:
        self.name = "test_scraper"
        self.blockout = SimpleNamespace()
        self._matches_cache = {}
        self._associations_cache = {}
        self.matches: list[tuple] = []
        self.stats: list[tuple] = []

    async def init_matches_cache(self, _pool_id):
        return None

    async def init_associations_cache(self, _pool_id):
        return None

    def schedule_match_changes(self, updated_match, prefix, priority):
        self.matches.append((updated_match, prefix, priority))

    def schedule_association_update(self, pool_id, team_id, stats):
        self.stats.append((pool_id, team_id, stats))


class OwnerPreloadScraper(Scraper):
    """Exercise the real owner-state change sets through the pool pipeline."""

    async def run_scraping(self) -> None:
        return None


def test_csv_pipeline_preserves_owner_write_order_and_cleanup_inputs(
    monkeypatch,
) -> None:
    """Protect pool/team/association/match assembly from one controlled row."""

    async def scenario() -> None:
        scraper = RecordingScraper()
        pool = _pool()
        pool.id = None
        scraped_pool_ids: set[int] = set()
        rows = (
            FfvbCalendarMatch(
                league_code="LNAQ",
                match_code="M001",
                home_club_id="club-a",
                away_club_id="club-b",
                home_team_name="TOURS VB",
                away_team_name="PARIS",
                match_date="2026-10-04",
                match_time="18:30",
                set_score="3/1",
                points_score="25-20,25-22,20-25,25-18",
                venue="GYMNASE CENTRAL",
                first_referee="ARBITRE A",
                second_referee="ARBITRE B",
            ),
        )
        teams: list[Team] = []
        associations: list[tuple] = []
        deactivations: list[tuple] = []

        async def download(*_args):
            return FfvbCalendarSnapshot(matches=rows, complete=True)

        async def save_pool(_session, candidate, _existing, _allow):
            candidate.id = 10
            return candidate

        async def get_teams(*args, **kwargs):
            if kwargs.get("ids") or (args and args[0] is None):
                return teams
            return []

        async def save_team(_session, candidate, _existing):
            candidate.id = 101 if candidate.club_id == "club-a" else 102
            teams.append(candidate)
            return candidate

        async def associate(pool_id, team_id, club_id):
            associations.append((pool_id, team_id, club_id))

        async def stats(*_args):
            return (
                FfvbRanking(
                    team_name="TOURS VB",
                    points=9,
                    played=0,
                    wins=0,
                    losses=0,
                    wins_three_to_zero=0,
                    wins_three_to_one=0,
                    wins_three_to_two=0,
                    losses_two_to_three=0,
                    losses_one_to_three=0,
                    losses_zero_to_three=0,
                    won_sets=0,
                    lost_sets=0,
                    coefficient_sets=0,
                    won_points=0,
                    lost_points=0,
                    coefficient_points=0,
                ),
            )

        async def deactivate_teams(pool_id, identifiers):
            deactivations.append(("teams", pool_id, identifiers))

        async def deactivate_matches(pool_id, identifiers):
            deactivations.append(("matches", pool_id, identifiers))

        monkeypatch.setattr(pipeline, "download_and_parse_csv", download)
        monkeypatch.setattr(pipeline, "add_or_update_pool", save_pool)
        monkeypatch.setattr(pipeline, "add_or_update_team", save_team)
        monkeypatch.setattr(pipeline, "extract_club_stats_list", stats)
        monkeypatch.setattr(pipeline, "log_event", lambda *_args, **_kwargs: None)
        scraper.blockout = SimpleNamespace(
            get_teams=get_teams,
            add_team_to_pool=associate,
            update_pool=lambda *_args: None,
            bulk_deactivate_teams=deactivate_teams,
            bulk_deactivate_matches=deactivate_matches,
        )

        await pipeline.handle_csv_download_and_parse(
            scraper,
            pool,
            "2026/2027",
            scraped_pool_ids=scraped_pool_ids,
        )

        match, prefix, priority = scraper.matches[0]
        assert (match.pool_id, match.team_id_a, match.team_id_b) == (10, 101, 102)
        assert match.match_date == datetime(2026, 10, 4, 16, 30, tzinfo=UTC)
        assert match.set == "3-1"
        assert match.venue == "Gymnase Central"
        assert prefix == "CSV"
        assert priority.name == "FFVB"
        assert associations == [(10, 101, "club-a"), (10, 102, "club-b")]
        assert scraper.stats[0][:2] == (10, 101)
        assert scraped_pool_ids == {10}
        assert deactivations == []

    asyncio.run(scenario())


def test_failed_csv_download_keeps_an_existing_pool_active(monkeypatch) -> None:
    """Protect the outage safeguard that records an existing pool as observed."""

    async def scenario() -> None:
        scraper = RecordingScraper()
        existing = _pool()
        observed: set[int] = set()

        async def fail(*_args):
            return None

        monkeypatch.setattr(pipeline, "download_and_parse_csv", fail)
        monkeypatch.setattr(pipeline, "log_event", lambda *_args, **_kwargs: None)

        await pipeline.handle_csv_download_and_parse(
            scraper,
            _pool(),
            "2026/2027",
            existing_pool=existing,
            scraped_pool_ids=observed,
        )

        assert observed == {10}
        assert scraper.matches == []

    asyncio.run(scenario())


def test_invalid_csv_rows_stop_before_any_owner_write(monkeypatch) -> None:
    """Protect validation failure isolation before pool creation or mutation."""

    async def scenario() -> None:
        scraper = RecordingScraper()

        async def invalid(*_args):
            return FfvbCalendarSnapshot(
                matches=(
                    FfvbCalendarMatch(
                        league_code="LNAQ",
                        match_code="",
                        home_club_id="",
                        away_club_id="",
                        home_team_name="",
                        away_team_name="",
                        match_date="",
                        match_time="",
                        set_score=None,
                        points_score=None,
                        venue=None,
                        first_referee=None,
                        second_referee=None,
                    ),
                ),
                complete=False,
            )

        async def unexpected(*_args):
            raise AssertionError("Invalid rows must not reach an owner API")

        monkeypatch.setattr(pipeline, "download_and_parse_csv", invalid)
        monkeypatch.setattr(pipeline, "add_or_update_pool", unexpected)
        monkeypatch.setattr(pipeline, "log_event", lambda *_args, **_kwargs: None)

        await pipeline.handle_csv_download_and_parse(scraper, _pool(), "2026/2027")

        assert scraper.matches == []

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("failed_operation", "expected_preloads"),
    [
        ("load_matches", ["load_matches"]),
        (
            "load_active_team_associations",
            ["load_matches", "load_active_team_associations"],
        ),
    ],
)
def test_owner_preload_failure_stops_pool_before_dependent_writes(
    monkeypatch,
    failed_operation: str,
    expected_preloads: list[str],
) -> None:
    """Prove incomplete owner state cannot authorize dependent reconciliation."""

    async def scenario() -> None:
        preloads: list[str] = []
        owner_writes: list[str] = []
        events: list[dict] = []

        class Owner:
            async def get_matches(self, _pool_id):
                preloads.append("load_matches")
                if failed_operation == "load_matches":
                    raise RuntimeError("injected owner failure")
                return []

            async def get_active_team_associations(self, _pool_id):
                preloads.append("load_active_team_associations")
                if failed_operation == "load_active_team_associations":
                    raise RuntimeError("injected owner failure")
                return []

            async def get_teams(self, *_args, **_kwargs):
                raise AssertionError("Owner preload failure must stop dependent work")

            async def add_team_to_pool(self, *_args):
                raise AssertionError("Owner preload failure must stop dependent work")

            async def update_pool(self, *_args):
                raise AssertionError("Owner preload failure must stop dependent work")

            async def bulk_deactivate_teams(self, *_args):
                raise AssertionError("Owner preload failure must stop dependent work")

            async def bulk_deactivate_matches(self, *_args):
                raise AssertionError("Owner preload failure must stop dependent work")

        scraper = OwnerPreloadScraper(None, Owner(), "test_scraper")

        async def download(*_args):
            return FfvbCalendarSnapshot(
                matches=(
                    FfvbCalendarMatch(
                        league_code="LNAQ",
                        match_code="M001",
                        home_club_id="club-a",
                        away_club_id="club-b",
                        home_team_name="TOURS VB",
                        away_team_name="PARIS",
                        match_date="2026-10-04",
                        match_time="18:30",
                        set_score="3/1",
                        points_score="25-20,25-22,20-25,25-18",
                        venue="GYMNASE CENTRAL",
                        first_referee="ARBITRE A",
                        second_referee="ARBITRE B",
                    ),
                ),
                complete=True,
            )

        async def save_pool(_session, candidate, _existing, _allow):
            owner_writes.append("pool")
            candidate.id = 10
            return candidate

        async def unexpected_owner_call(*_args, **_kwargs):
            raise AssertionError("Owner preload failure must stop dependent work")

        def record_event(action, level="info", **details):
            events.append({"action": action, "level": level, **details})

        monkeypatch.setattr(pipeline, "download_and_parse_csv", download)
        monkeypatch.setattr(pipeline, "add_or_update_pool", save_pool)
        monkeypatch.setattr(pipeline, "add_or_update_team", unexpected_owner_call)
        monkeypatch.setattr(pipeline, "extract_club_stats_list", unexpected_owner_call)
        monkeypatch.setattr(pipeline, "log_event", record_event)

        with pytest.raises(pipeline.OwnerStatePreloadError):
            await pipeline.handle_csv_download_and_parse(
                scraper,
                _pool(),
                "2026/2027",
            )

        assert preloads == expected_preloads
        assert owner_writes == ["pool"]
        assert events == [
            {
                "action": "owner_state_preload_error",
                "level": "error",
                "scraper": "test_scraper",
                "pool_id": 10,
                "operation": failed_operation,
                "error_type": "RuntimeError",
                "exception_context": (
                    "Owner API state is unavailable; inspect the dependency and "
                    "retry before reconciling this pool."
                ),
            }
        ]

    asyncio.run(scenario())
