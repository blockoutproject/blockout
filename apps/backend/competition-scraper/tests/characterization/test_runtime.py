import asyncio
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import httpx
import pytest
import scraper.bootstrap as competition_main
import scraper.infrastructure.blockout.auth as auth0
import scraper.infrastructure.provider_http as provider_http
import scraper.infrastructure.scheduling.scheduler as scheduler_module
from scraper.application.factory import ScraperFactory
from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.departmental import DepartmentalScraper
from scraper.infrastructure.ffvb.national import NationalScraper
from scraper.infrastructure.ffvb.regional import RegionalScraper
from scraper.infrastructure.lnv.professional import ProScraper


class DummyScraper(Scraper):
    """Concrete legacy base for provider runtime tests."""

    async def run_scraping(self) -> None:
        return None


class _Gauge:
    def __init__(self) -> None:
        self.values: list[float] = []

    def set(self, value: float) -> None:
        self.values.append(value)


def test_provider_fetch_preserves_encoding_timeout_retry_and_tls(monkeypatch) -> None:
    """Protect the shared GET adapter's bounded network behavior."""

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
            return httpx.Response(200, content=b"caf\xe9")

        async def sleep(delay: int) -> None:
            sleeps.append(delay)

        monkeypatch.setattr(provider_http.asyncio, "sleep", sleep)
        monkeypatch.setattr(provider_http, "log_event", lambda **_event: None)
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            scraper = DummyScraper(object(), client, "dummy")
            result = await scraper.fetch("https://www.ffvbbeach.org/provider")

        assert result == "café"
        assert attempts == 3
        assert all(call.extensions["timeout"]["read"] == 20 for call in calls)
        assert sleeps == [5, 5]

    asyncio.run(scenario())


def test_provider_fetch_raises_only_after_three_failures(monkeypatch) -> None:
    """Protect terminal provider failure and retry count."""

    async def scenario() -> None:
        attempts = 0

        def timeout(request: httpx.Request) -> httpx.Response:
            nonlocal attempts
            attempts += 1
            raise httpx.ReadTimeout("provider timeout", request=request)

        async def sleep(_delay: int) -> None:
            return None

        monkeypatch.setattr(provider_http.asyncio, "sleep", sleep)
        monkeypatch.setattr(provider_http, "log_event", lambda **_event: None)

        async with httpx.AsyncClient(transport=httpx.MockTransport(timeout)) as client:
            with pytest.raises(Exception, match="3 tentatives"):
                await DummyScraper(object(), client, "dummy").fetch(
                    "https://provider.invalid"
                )

        assert attempts == 3

    asyncio.run(scenario())


def test_provider_decode_honors_utf8_html_declaration() -> None:
    """Protect UTF-8 FFVolley pages from the FFVB Beach fallback encoding."""
    content = '<meta charset="utf-8"><p>Nouvelle-Aquitaine — compétition</p>'.encode()

    assert provider_http.ProviderHttpClient._decode(
        "https://www.ffvb.org/provider", content
    ).endswith("Nouvelle-Aquitaine — compétition</p>")


def test_top_level_runner_limits_scraper_concurrency_to_two(monkeypatch) -> None:
    """Protect source ordering and maximum concurrent scraper count."""

    async def scenario() -> None:
        active = 0
        maximum = 0
        started: list[str] = []

        async def run_one(
            _session,
            _provider_client,
            scraper_type,
            _raw_division_mapping_api=None,
            _team_api=None,
            _pool_api=None,
            _competition_api=None,
            _match_api=None,
        ):
            nonlocal active, maximum
            active += 1
            maximum = max(maximum, active)
            started.append(scraper_type)
            await asyncio.sleep(0.01)
            active -= 1

        monkeypatch.setattr(competition_main, "_run_one_scraper", run_one)

        await competition_main.run_scrapers_with_max_concurrency(
            object(),
            object(),
            ["regional", "departmental", "national", "pro"],
        )

        assert maximum == 2
        assert started == ["regional", "departmental", "national", "pro"]

    asyncio.run(scenario())


def test_main_fails_closed_when_scraper_status_is_unavailable(monkeypatch) -> None:
    """Protect status gating, return value, and duration measurement."""

    async def scenario() -> None:
        class Session:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

        async def fail(_session, _name):
            raise RuntimeError("config unavailable")

        gauge = _Gauge()
        events: list[dict] = []
        monkeypatch.setattr(
            competition_main.aiohttp, "ClientSession", lambda **_kwargs: Session()
        )
        monkeypatch.setattr(competition_main, "get_scraper_status", fail)
        monkeypatch.setattr(competition_main, "execution_duration_gauge", gauge)
        monkeypatch.setattr(
            competition_main, "log_event", lambda **event: events.append(event)
        )

        assert await competition_main.main() is False
        assert events[-1]["action"] == "scraper_status_fetch_failed"
        assert len(gauge.values) == 1

    asyncio.run(scenario())


def test_enabled_main_preserves_sessions_connector_and_configured_sources(
    monkeypatch,
) -> None:
    """Protect ten-second sessions, connection limit, proxy trust, and source list."""

    async def scenario() -> None:
        observed: dict = {"sessions": []}

        class Session:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

        def session(**kwargs):
            observed["sessions"].append(kwargs)
            return Session()

        def connector(**kwargs):
            observed["connector"] = kwargs
            return "connector"

        async def status(_session, _name):
            return SimpleNamespace(enabled=True)

        def limits(**kwargs):
            observed["limits"] = kwargs
            return "limits"

        def httpx_client(**kwargs):
            observed["httpx"] = kwargs
            return Session()

        async def run(
            session,
            provider_client,
            scraper_types,
            raw_division_mapping_api=None,
            team_api=None,
            pool_api=None,
            competition_api=None,
            match_api=None,
            max_concurrency=2,
        ):
            observed["run"] = (
                session,
                provider_client,
                list(scraper_types),
                raw_division_mapping_api,
                team_api,
                pool_api,
                competition_api,
                match_api,
                max_concurrency,
            )

        monkeypatch.setattr(competition_main.aiohttp, "ClientSession", session)
        monkeypatch.setattr(competition_main.aiohttp, "TCPConnector", connector)
        monkeypatch.setattr(competition_main.httpx, "Limits", limits)
        monkeypatch.setattr(competition_main.httpx, "AsyncClient", httpx_client)
        monkeypatch.setattr(competition_main, "get_scraper_status", status)
        monkeypatch.setattr(competition_main, "run_scrapers_with_max_concurrency", run)
        monkeypatch.setattr(competition_main, "execution_duration_gauge", _Gauge())

        assert await competition_main.main() is True
        assert [item["timeout"].total for item in observed["sessions"]] == [10]
        assert all(item["trust_env"] is True for item in observed["sessions"])
        assert observed["connector"] == {"limit": 20}
        assert observed["limits"] == {"max_connections": 20}
        assert observed["httpx"] == {
            "timeout": 10,
            "trust_env": True,
            "follow_redirects": True,
            "limits": "limits",
        }
        assert observed["run"][2] == ["regional", "departmental", "national", "pro"]
        assert observed["run"][3] is not None
        assert observed["run"][4] is not None
        assert observed["run"][5] is not None
        assert observed["run"][6] is not None
        assert observed["run"][7] is not None
        assert observed["run"][8] == 2

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("moment", "seconds"),
    [
        (datetime(2026, 7, 19, 13, 0, tzinfo=ZoneInfo("Europe/Paris")), 1800),
        (datetime(2026, 7, 19, 14, 0, tzinfo=ZoneInfo("Europe/Paris")), 300),
        (datetime(2026, 7, 18, 16, 0, tzinfo=ZoneInfo("Europe/Paris")), 1800),
        (datetime(2026, 7, 18, 17, 0, tzinfo=ZoneInfo("Europe/Paris")), 300),
        (datetime(2026, 7, 20, 12, 0, tzinfo=ZoneInfo("Europe/Paris")), 1800),
    ],
)
def test_scheduler_frequency_policy(moment, seconds) -> None:
    """Protect weekday and weekend scrape intervals in Europe/Paris."""
    assert scheduler_module.desired_interval_seconds(moment) == seconds


def test_scheduler_advances_last_run_only_after_a_real_run(monkeypatch) -> None:
    """Protect skip behavior and status-failure retry on the next minute tick."""

    async def scenario() -> None:
        now = datetime(2026, 7, 20, 12, 0, tzinfo=ZoneInfo("Europe/Paris"))
        outcomes = iter([False, True])
        calls = 0

        async def scrape():
            nonlocal calls
            calls += 1
            return next(outcomes)

        monkeypatch.setattr(scheduler_module, "_paris_now", lambda: now)
        monkeypatch.setattr(scheduler_module, "_last_run", None)
        monkeypatch.setattr(scheduler_module, "log_event", lambda **_event: None)

        await scheduler_module.maybe_run_scraper(scrape)
        assert scheduler_module._last_run is None
        await scheduler_module.maybe_run_scraper(scrape)
        assert scheduler_module._last_run == now
        await scheduler_module.maybe_run_scraper(scrape)
        assert calls == 2

    asyncio.run(scenario())


def test_scheduler_polls_every_minute_without_overlap(monkeypatch) -> None:
    """Protect APScheduler polling, coalescing, and single-instance settings."""

    class Scheduler:
        def __init__(self) -> None:
            self.job = None
            self.started = False

        def add_job(self, *args, **kwargs):
            self.job = (args, kwargs)

        def start(self):
            self.started = True

    scheduler = Scheduler()
    monkeypatch.setattr(scheduler_module, "AsyncIOScheduler", lambda: scheduler)
    monkeypatch.setattr(scheduler_module, "log_event", lambda **_event: None)

    scheduler_module.schedule_scraper(lambda: None)

    args, kwargs = scheduler.job
    assert args == (scheduler_module.maybe_run_scraper, "interval")
    assert kwargs["seconds"] == 60
    assert kwargs["misfire_grace_time"] == 30
    assert kwargs["replace_existing"] is True
    assert kwargs["max_instances"] == 1
    assert kwargs["coalesce"] is True
    assert scheduler.started is True


def test_auth0_token_cache_refreshes_inside_the_safety_window(monkeypatch) -> None:
    """Protect M2M cache reuse, five-minute safety, and authorization headers."""

    async def scenario() -> None:
        fetches: list[int] = []

        async def fetch():
            fetches.append(1)
            return "token", 3600

        monkeypatch.setattr(auth0, "M2M_ENABLED", True)
        monkeypatch.setattr(auth0, "_MIRROR_TOKEN", "cached")
        monkeypatch.setattr(auth0, "_TOKEN_EXP_EPOCH", 5000.0)
        monkeypatch.setattr(auth0.time, "time", lambda: 1000.0)
        monkeypatch.setattr(auth0, "fetch_auth0_token", fetch)

        await auth0.ensure_token()
        assert fetches == []
        assert auth0._get_headers() == {"Authorization": "Bearer cached"}

        monkeypatch.setattr(auth0, "_TOKEN_EXP_EPOCH", 1200.0)
        await auth0.ensure_token()
        assert fetches == [1]
        assert auth0._get_headers() == {"Authorization": "Bearer token"}

    asyncio.run(scenario())


def test_application_startup_exposes_metrics_and_supervises_background_work(
    monkeypatch,
) -> None:
    """Exercise startup wiring without contacting providers or Blockout APIs."""

    async def scenario() -> None:
        ports: list[int] = []
        scheduled: list = []
        tasks: list = []

        class Event:
            async def wait(self):
                return None

        def create_task(coroutine):
            tasks.append(coroutine)
            coroutine.close()

        monkeypatch.setattr(competition_main, "start_http_server", ports.append)
        monkeypatch.setattr(
            competition_main,
            "schedule_scraper",
            lambda scrape_fn: scheduled.append(scrape_fn),
        )
        monkeypatch.setattr(competition_main.asyncio, "create_task", create_task)
        monkeypatch.setattr(competition_main.asyncio, "Event", Event)
        monkeypatch.setattr(competition_main, "log_event", lambda **_event: None)

        await competition_main.app()

        assert ports == [8000]
        assert scheduled == [competition_main.main]
        assert len(tasks) == 1

    asyncio.run(scenario())


def test_factory_maps_only_the_four_supported_sources() -> None:
    """Protect configured source names and concrete adapter selection."""
    assert isinstance(
        ScraperFactory.create_scraper("regional", None, None), RegionalScraper
    )
    assert isinstance(
        ScraperFactory.create_scraper("departmental", None, None),
        DepartmentalScraper,
    )
    assert isinstance(
        ScraperFactory.create_scraper("national", None, None), NationalScraper
    )
    assert isinstance(ScraperFactory.create_scraper("pro", None, None), ProScraper)
    with pytest.raises(ValueError, match="inconnu"):
        ScraperFactory.create_scraper("unknown", None, None)
