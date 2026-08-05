import asyncio
import threading
from contextlib import asynccontextmanager
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
import pytest
import scraper.bootstrap as competition_main
import scraper.infrastructure.blockout.auth as auth0
import scraper.infrastructure.provider_http as provider_http
import scraper.infrastructure.scheduling.scheduler as scheduler_module
from scraper.application.source import Scraper
from scraper.infrastructure.ffvb.departmental import DepartmentalScraper
from scraper.infrastructure.ffvb.national import NationalScraper
from scraper.infrastructure.ffvb.regional import RegionalScraper
from scraper.infrastructure.lnv.professional import ProScraper
from scraper.infrastructure.sources import create_scraper


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
            scraper = DummyScraper(
                provider_http.ProviderHttpClient(client), None, "dummy"
            )
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
                await DummyScraper(
                    provider_http.ProviderHttpClient(client), None, "dummy"
                ).fetch("https://provider.invalid")

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
            _provider_http,
            _blockout,
            scraper_type,
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
        class Owner:
            async def scraper_enabled(self, _name):
                raise RuntimeError("config unavailable")

        @asynccontextmanager
        async def open_owner():
            yield Owner()

        gauge = _Gauge()
        events: list[dict] = []
        monkeypatch.setattr(competition_main, "open_blockout_clients", open_owner)
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
        observed: dict = {}

        class Session:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

        class Owner:
            async def scraper_enabled(self, _name):
                return True

        owner = Owner()

        @asynccontextmanager
        async def open_owner():
            yield owner

        def limits(**kwargs):
            observed["limits"] = kwargs
            return "limits"

        def httpx_client(**kwargs):
            observed["httpx"] = kwargs
            return Session()

        async def run(
            provider_http,
            blockout,
            scraper_types,
            max_concurrency=2,
        ):
            observed["run"] = (
                provider_http,
                blockout,
                list(scraper_types),
                max_concurrency,
            )

        monkeypatch.setattr(competition_main.httpx, "Limits", limits)
        monkeypatch.setattr(competition_main.httpx, "AsyncClient", httpx_client)
        monkeypatch.setattr(competition_main, "open_blockout_clients", open_owner)
        monkeypatch.setattr(competition_main, "run_scrapers_with_max_concurrency", run)
        monkeypatch.setattr(competition_main, "execution_duration_gauge", _Gauge())

        assert await competition_main.main() is True
        assert observed["limits"] == {"max_connections": 20}
        assert observed["httpx"] == {
            "timeout": 10,
            "trust_env": True,
            "follow_redirects": True,
            "limits": "limits",
        }
        assert observed["run"][2] == ["regional", "departmental", "national", "pro"]
        assert observed["run"][1] is owner
        assert observed["run"][3] == 2

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

    result = scheduler_module.schedule_scraper(lambda: None)

    args, kwargs = scheduler.job
    assert args == (scheduler_module.maybe_run_scraper, "interval")
    assert kwargs["seconds"] == 60
    assert kwargs["misfire_grace_time"] == 30
    assert kwargs["replace_existing"] is True
    assert kwargs["max_instances"] == 1
    assert kwargs["coalesce"] is True
    assert scheduler.started is True
    assert result is scheduler


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


def test_auth0_fetch_keeps_the_event_loop_responsive(monkeypatch) -> None:
    """Prove blocking token I/O runs outside the application event loop."""

    async def scenario() -> None:
        loop = asyncio.get_running_loop()
        token_call_started = asyncio.Event()
        heartbeat_progressed = threading.Event()
        calls: list[tuple[str, ...]] = []

        class Client:
            def __init__(self, *credentials: str) -> None:
                calls.append(credentials)

            def client_credentials(self, audience: str) -> dict[str, str | int]:
                calls.append((audience,))
                loop.call_soon_threadsafe(token_call_started.set)
                if not heartbeat_progressed.wait(timeout=1):
                    raise AssertionError("The event loop did not progress")
                return {"access_token": "service-token", "expires_in": 7200}

        async def heartbeat() -> None:
            await token_call_started.wait()
            heartbeat_progressed.set()

        monkeypatch.setattr(auth0, "GetToken", Client)

        heartbeat_task = asyncio.create_task(heartbeat())
        token = await auth0.fetch_auth0_token()
        await heartbeat_task

        assert token == ("service-token", 7200)
        assert calls == [
            (auth0.AUTH0_DOMAIN, auth0.AUTH0_CLIENT_ID, auth0.AUTH0_CLIENT_SECRET),
            (auth0.AUTH0_AUDIENCE,),
        ]

    asyncio.run(scenario())


def test_auth0_fetch_propagates_dependency_failure(monkeypatch) -> None:
    """Preserve the Auth0 failure outcome at the fetch boundary."""

    async def scenario() -> None:
        class Client:
            def __init__(self, *_credentials: str) -> None:
                pass

            def client_credentials(self, _audience: str) -> dict[str, str]:
                raise RuntimeError("auth0 unavailable")

        monkeypatch.setattr(auth0, "GetToken", Client)

        with pytest.raises(RuntimeError, match="auth0 unavailable"):
            await auth0.fetch_auth0_token()

    asyncio.run(scenario())


def test_auth0_fetch_cancellation_preserves_the_token_cache(monkeypatch) -> None:
    """Keep cancellation visible without replacing or locking the token cache."""

    async def scenario() -> None:
        loop = asyncio.get_running_loop()
        token_call_started = asyncio.Event()
        release_token_call = threading.Event()
        token_call_finished = threading.Event()

        class Client:
            def __init__(self, *_credentials: str) -> None:
                pass

            def client_credentials(self, _audience: str) -> dict[str, str | int]:
                loop.call_soon_threadsafe(token_call_started.set)
                try:
                    if not release_token_call.wait(timeout=1):
                        raise AssertionError("Cancellation did not release the caller")
                    return {
                        "access_token": "replacement-token",
                        "expires_in": 7200,
                    }
                finally:
                    token_call_finished.set()

        monkeypatch.setattr(auth0, "GetToken", Client)
        monkeypatch.setattr(auth0, "M2M_ENABLED", True)
        monkeypatch.setattr(auth0, "_MIRROR_TOKEN", "current-token")
        monkeypatch.setattr(auth0, "_TOKEN_EXP_EPOCH", 0.0)
        task = asyncio.create_task(auth0.ensure_token())

        await token_call_started.wait()
        task.cancel()
        try:
            with pytest.raises(asyncio.CancelledError):
                await task
        finally:
            release_token_call.set()
            await asyncio.to_thread(token_call_finished.wait)

        assert auth0.get_token() == "current-token"
        assert auth0._TOKEN_EXP_EPOCH == 0.0
        assert auth0._TOKEN_LOCK.locked() is False

    asyncio.run(scenario())


def test_application_startup_exposes_metrics_and_supervises_background_work(
    monkeypatch,
) -> None:
    """Prove startup owns and cancels every long-lived background task."""

    async def scenario() -> None:
        loop = asyncio.get_running_loop()
        ports: list[int] = []
        scheduled: list = []
        scheduler_shutdowns: list[bool] = []
        refresh_wait = loop.create_future()
        scheduled_wait = loop.create_future()
        refresh_cancelled = False
        scheduled_cancelled = False

        async def refresh() -> None:
            nonlocal refresh_cancelled
            try:
                await refresh_wait
            finally:
                refresh_cancelled = True

        async def scheduled_work() -> None:
            nonlocal scheduled_cancelled
            try:
                await scheduled_wait
            finally:
                scheduled_cancelled = True

        class Scheduler:
            def __init__(self) -> None:
                self.task = asyncio.create_task(scheduled_work())

            def shutdown(self, wait: bool = True) -> None:
                scheduler_shutdowns.append(wait)
                self.task.cancel()

        scheduler = Scheduler()

        class Event:
            async def wait(self) -> None:
                await asyncio.sleep(0)
                raise asyncio.CancelledError

        def schedule(scrape_fn):
            scheduled.append(scrape_fn)
            return scheduler

        monkeypatch.setattr(competition_main, "start_http_server", ports.append)
        monkeypatch.setattr(competition_main, "refresh_token_task", refresh)
        monkeypatch.setattr(competition_main, "schedule_scraper", schedule)
        monkeypatch.setattr(competition_main.asyncio, "Event", Event)
        monkeypatch.setattr(competition_main, "log_event", lambda **_event: None)

        with pytest.raises(asyncio.CancelledError):
            await competition_main.app()

        assert ports == [8000]
        assert scheduled == [competition_main.main]
        assert scheduler_shutdowns == [False]
        assert scheduler.task.done()
        assert refresh_cancelled is True
        assert scheduled_cancelled is True

    asyncio.run(scenario())


def test_factory_maps_only_the_four_supported_sources() -> None:
    """Protect configured source names and concrete adapter selection."""
    assert isinstance(create_scraper("regional", None, None), RegionalScraper)
    assert isinstance(
        create_scraper("departmental", None, None),
        DepartmentalScraper,
    )
    assert isinstance(create_scraper("national", None, None), NationalScraper)
    assert isinstance(create_scraper("pro", None, None), ProScraper)
    with pytest.raises(ValueError, match="inconnu"):
        create_scraper("unknown", None, None)
