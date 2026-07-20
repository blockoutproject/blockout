import asyncio
from datetime import UTC, datetime
from pathlib import Path

from models.association_stats import AssociationStats
from models.pool import Pool
from models.team import Team
from utils import file_utils
from utils import scraper_logic as pipeline
from utils.file_utils import download_and_parse_csv

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
        poolCode="R1M",
        leagueCode="LNAQ",
        season="2026/2027",
        divisionId=7,
        leagueName="Nouvelle Aquitaine",
        rawName="Poule A",
        name="Poule A",
        shortName="Poule A",
        format="SIX",
        gender="M",
        id=10,
    )


def test_csv_download_preserves_post_shape_encoding_timeout_and_retries(
    monkeypatch,
) -> None:
    """Protect the FFVB export request and its independent retry policy."""

    async def scenario() -> None:
        session = _Session([TimeoutError(), TimeoutError(), _Response()])
        scraper = type("Scraper", (), {"session": session})()
        sleeps: list[int] = []

        async def sleep(delay: int) -> None:
            sleeps.append(delay)

        monkeypatch.setattr(file_utils.asyncio, "sleep", sleep)
        monkeypatch.setattr(file_utils, "log_event", lambda **_event: None)

        rows = list(await download_and_parse_csv(scraper, _pool(), "2026/2027"))

        assert rows[0]["matchCode"] == "M001"
        assert len(session.calls) == 3
        url, kwargs = session.calls[-1]
        assert url.endswith("vbspo_calendrier_export.php")
        assert kwargs["data"] == {
            "cal_saison": "2026/2027",
            "cal_codent": "LNAQ",
            "cal_codpoule": "R1M",
        }
        assert kwargs["timeout"].total == 20
        assert kwargs["ssl"] is False
        assert sleeps == [5, 5]

    asyncio.run(scenario())


class RecordingScraper:
    """Record the complete CSV application trace."""

    def __init__(self) -> None:
        self.session = _Session()
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


def test_csv_pipeline_preserves_owner_write_order_and_cleanup_inputs(
    monkeypatch,
) -> None:
    """Protect pool/team/association/match assembly from one controlled row."""

    async def scenario() -> None:
        scraper = RecordingScraper()
        pool = _pool()
        pool.id = None
        scraped_pool_ids: set[int] = set()
        rows = [
            {
                "matchCode": "M001",
                "club_a_id": "club-a",
                "club_b_id": "club-b",
                "team_a_name": "TOURS VB",
                "team_b_name": "PARIS",
                "matchDate": "2026-10-04",
                "match_time": "18:30",
                "set": "3/1",
                "score": "25-20,25-22,20-25,25-18",
                "venue": "GYMNASE CENTRAL",
                "firstReferee": "ARBITRE A",
                "secondReferee": "ARBITRE B",
            }
        ]
        teams: list[Team] = []
        associations: list[tuple] = []
        deactivations: list[tuple] = []

        async def download(*_args):
            return rows

        async def save_pool(_session, candidate, _existing, _allow):
            candidate.id = 10
            return candidate

        async def get_teams(_session, *args, **kwargs):
            if kwargs.get("ids") or (args and args[0] is None):
                return teams
            return []

        async def save_team(_session, candidate, _existing):
            candidate.id = 101 if candidate.clubId == "club-a" else 102
            teams.append(candidate)
            return candidate

        async def associate(_session, pool_id, team_id, club_id):
            associations.append((pool_id, team_id, club_id))

        async def stats(*_args):
            return [("TOURS VB", AssociationStats(points=9))]

        async def deactivate_teams(_session, pool_id, identifiers):
            deactivations.append(("teams", pool_id, identifiers))

        async def deactivate_matches(_session, pool_id, identifiers):
            deactivations.append(("matches", pool_id, identifiers))

        monkeypatch.setattr(pipeline, "download_and_parse_csv", download)
        monkeypatch.setattr(pipeline, "add_or_update_pool", save_pool)
        monkeypatch.setattr(pipeline, "get_teams", get_teams)
        monkeypatch.setattr(pipeline, "add_or_update_team", save_team)
        monkeypatch.setattr(pipeline, "add_team_to_pool", associate)
        monkeypatch.setattr(pipeline, "extract_club_stats_list", stats)
        monkeypatch.setattr(pipeline, "bulk_deactivate_teams_by_pool", deactivate_teams)
        monkeypatch.setattr(pipeline, "bulk_deactivate_matches", deactivate_matches)
        monkeypatch.setattr(pipeline, "log_event", lambda *_args, **_kwargs: None)

        await pipeline.handle_csv_download_and_parse(
            scraper,
            pool,
            "2026/2027",
            scraped_pool_ids=scraped_pool_ids,
        )

        match, prefix, priority = scraper.matches[0]
        assert (match.poolId, match.teamIdA, match.teamIdB) == (10, 101, 102)
        assert match.matchDate == datetime(2026, 10, 4, 16, 30, tzinfo=UTC)
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
            return [{"matchCode": "", "club_a_id": "", "club_b_id": ""}]

        async def unexpected(*_args):
            raise AssertionError("Invalid rows must not reach an owner API")

        monkeypatch.setattr(pipeline, "download_and_parse_csv", invalid)
        monkeypatch.setattr(pipeline, "add_or_update_pool", unexpected)
        monkeypatch.setattr(pipeline, "log_event", lambda *_args, **_kwargs: None)

        await pipeline.handle_csv_download_and_parse(scraper, _pool(), "2026/2027")

        assert scraper.matches == []

    asyncio.run(scenario())
