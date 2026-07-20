import asyncio

import pytest
from scraper import bootstrap
from scraper.bootstrap import ClubScraperRuntime
from scraper.config.settings import Settings
from scraper.infrastructure.blockout.auth import (
    Auth0TokenRefresher,
    TokenStore,
)
from scraper.infrastructure.ffvb import client as ffvb_module
from scraper.infrastructure.ffvb.client import FfvbClubClient
from scraper.infrastructure.scheduling import (
    scheduler as scheduler_module,
)


class _Content:
    def __init__(self, body: bytes) -> None:
        self.body = body

    async def read(self) -> bytes:
        return self.body


class _Response:
    def __init__(
        self,
        body: bytes = b"",
        *,
        status: int = 200,
        payload=None,
    ) -> None:
        self.content = _Content(body)
        self.status = status
        self.payload = payload
        self.content_type = "application/json"

    def raise_for_status(self) -> None:
        return None

    async def json(self):
        return self.payload


class _Context:
    def __init__(self, result) -> None:
        self.result = result

    async def __aenter__(self):
        if isinstance(self.result, BaseException):
            raise self.result
        return self.result

    async def __aexit__(self, *_args) -> None:
        return None


class _ScriptedSession:
    def __init__(self, results) -> None:
        self.results = list(results)
        self.calls: list[dict] = []

    def post(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        return _Context(self.results.pop(0))


class _Gauge:
    def __init__(self) -> None:
        self.values: list[float] = []

    def set(self, value: float) -> None:
        self.values.append(value)


def _settings() -> Settings:
    return Settings(
        team_api_url="http://teams.local/api/v1/teams",
        competition_api_url="http://competition.local/api/v1/competitions",
        club_api_url="http://clubs.local/api/v1/clubs",
        config_api_url="http://config.local/api/v1/config",
        log_level="INFO",
        auth0_domain="tenant.invalid",
        auth0_client_id="client",
        auth0_client_secret="secret",
        auth0_audience="audience",
    )


def test_fetch_decodes_ffvb_as_windows_1252() -> None:
    """Protect the provider-specific encoding and request constraints."""

    async def scenario() -> None:
        session = _ScriptedSession([_Response(b"caf\xe9")])

        result = await FfvbClubClient(session).fetch(
            "https://www.ffvbbeach.org/address",
            {"id": "1"},
        )

        assert result == "café"
        assert session.calls[0]["ssl"] is False
        assert session.calls[0]["timeout"].total == 20

    asyncio.run(scenario())


def test_fetch_retries_three_times_with_the_configured_delay(monkeypatch) -> None:
    """Protect retry count, delay, and eventual success."""

    async def scenario() -> None:
        session = _ScriptedSession([TimeoutError(), TimeoutError(), _Response(b"ok")])
        sleeps: list[int] = []

        async def sleep(delay: int) -> None:
            sleeps.append(delay)

        monkeypatch.setattr(ffvb_module.asyncio, "sleep", sleep)
        monkeypatch.setattr(ffvb_module, "log_event", lambda **_event: None)

        result = await FfvbClubClient(session).fetch("https://provider.invalid", {})

        assert result == "ok"
        assert len(session.calls) == 3
        assert sleeps == [2, 2]

    asyncio.run(scenario())


def test_fetch_raises_after_the_final_failed_attempt(monkeypatch) -> None:
    """Protect terminal failure after all retries are exhausted."""

    async def scenario() -> None:
        session = _ScriptedSession([TimeoutError(), TimeoutError(), TimeoutError()])

        async def sleep(_delay: int) -> None:
            return None

        monkeypatch.setattr(ffvb_module.asyncio, "sleep", sleep)
        monkeypatch.setattr(ffvb_module, "log_event", lambda **_event: None)

        with pytest.raises(RuntimeError, match="3 tentatives"):
            await FfvbClubClient(session).fetch("https://provider.invalid", {})

        assert len(session.calls) == 3

    asyncio.run(scenario())


def test_scraper_enabled_fails_closed_when_config_is_unavailable(monkeypatch) -> None:
    """Protect disabled ingestion when the status client fails."""

    async def scenario() -> None:
        class FailingClient:
            def __init__(self, *_args):
                return None

            async def get_scraper_status(self, _name):
                raise RuntimeError("config unavailable")

        class Session:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

        events: list[dict] = []
        monkeypatch.setattr(
            bootstrap.aiohttp, "ClientSession", lambda **_kwargs: Session()
        )
        monkeypatch.setattr(bootstrap, "BlockoutClients", FailingClient)
        monkeypatch.setattr(
            bootstrap, "log_event", lambda **event: events.append(event)
        )

        assert (
            await ClubScraperRuntime(_settings(), TokenStore()).scraper_enabled()
            is False
        )
        assert events[-1]["action"] == "scraper_status_fetch_failed"

    asyncio.run(scenario())


def test_execute_measures_disabled_runs_without_starting_ingestion(monkeypatch) -> None:
    """Protect duration observation for the disabled path."""

    async def scenario() -> None:
        runtime = ClubScraperRuntime(_settings(), TokenStore())
        gauge = _Gauge()

        async def disabled() -> bool:
            return False

        async def unexpected() -> None:
            raise AssertionError("Disabled scraper must not run")

        monkeypatch.setattr(runtime, "scraper_enabled", disabled)
        monkeypatch.setattr(runtime, "run_scraper", unexpected)
        monkeypatch.setattr(bootstrap, "execution_duration", gauge)

        await runtime.execute()

        assert len(gauge.values) == 1
        assert gauge.values[0] >= 0

    asyncio.run(scenario())


def test_run_scraper_keeps_the_characterized_session_limits(monkeypatch) -> None:
    """Protect process locking, connection limits, timeout, and adapter wiring."""

    async def scenario() -> None:
        observed: dict = {}

        class Session:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

        class Ingestion:
            def __init__(self, blockout, ffvb, gauge) -> None:
                observed["adapters"] = (blockout, ffvb, gauge)

            async def run(self) -> None:
                observed["ran"] = True

        def connector(**kwargs):
            observed["connector"] = kwargs
            return object()

        def session(**kwargs):
            observed["session"] = kwargs
            return Session()

        monkeypatch.setattr(bootstrap.aiohttp, "TCPConnector", connector)
        monkeypatch.setattr(bootstrap.aiohttp, "ClientSession", session)
        monkeypatch.setattr(bootstrap, "BlockoutClients", lambda *_args: "blockout")
        monkeypatch.setattr(bootstrap, "FfvbClubClient", lambda *_args: "ffvb")
        monkeypatch.setattr(bootstrap, "ClubIngestion", Ingestion)

        await ClubScraperRuntime(_settings(), TokenStore()).run_scraper()

        assert observed["connector"] == {"limit": 20, "ssl": False}
        assert observed["session"]["timeout"].total == 60
        assert observed["session"]["trust_env"] is True
        assert observed["adapters"][:2] == ("blockout", "ffvb")
        assert observed["ran"] is True

    asyncio.run(scenario())


def test_scheduler_registers_the_existing_hourly_job(monkeypatch) -> None:
    """Protect interval, eager first run, misfire grace, and replacement."""

    class Loop:
        def run_forever(self) -> None:
            return None

    class Scheduler:
        def __init__(self, event_loop) -> None:
            self.event_loop = event_loop
            self.job = None
            self.started = False

        def add_job(self, *args, **kwargs) -> None:
            self.job = (args, kwargs)

        def start(self) -> None:
            self.started = True

    async def job() -> None:
        return None

    loop = Loop()
    scheduler = Scheduler(loop)
    monkeypatch.setattr(scheduler_module.asyncio, "get_event_loop", lambda: loop)
    monkeypatch.setattr(
        scheduler_module,
        "AsyncIOScheduler",
        lambda event_loop: scheduler,
    )
    monkeypatch.setattr(scheduler_module, "log_event", lambda **_event: None)

    scheduler_module.run_hourly(job)

    args, kwargs = scheduler.job
    assert args == (job, "interval")
    assert kwargs["minutes"] == 60
    assert kwargs["misfire_grace_time"] == 30
    assert kwargs["replace_existing"] is True
    assert kwargs["next_run_time"].tzinfo is not None
    assert scheduler.started is True


def test_auth0_refresh_keeps_the_token_for_172800_seconds(monkeypatch) -> None:
    """Protect successful refresh cadence and shared token visibility."""

    async def scenario() -> None:
        token_store = TokenStore()
        refresher = Auth0TokenRefresher(_settings(), token_store)
        sleeps: list[int] = []

        async def fetch() -> str:
            return "service-token"

        async def sleep(delay: int) -> None:
            sleeps.append(delay)
            raise asyncio.CancelledError

        monkeypatch.setattr(refresher, "fetch", fetch)
        monkeypatch.setattr(
            "scraper.infrastructure.blockout.auth.asyncio.sleep",
            sleep,
        )

        with pytest.raises(asyncio.CancelledError):
            await refresher.run()

        assert token_store.get() == "service-token"
        assert sleeps == [172800]

    asyncio.run(scenario())


def test_startup_smoke_wires_metrics_refresh_and_scheduler_without_network(
    monkeypatch,
) -> None:
    """Exercise the production entry composition without external I/O."""

    class Loop:
        def __init__(self) -> None:
            self.tasks = 0
            self.drains = 0

        def create_task(self, coroutine) -> None:
            self.tasks += 1
            coroutine.close()

        def run_until_complete(self, coroutine) -> None:
            self.drains += 1
            coroutine.close()

    loop = Loop()
    ports: list[int] = []
    jobs: list = []
    monkeypatch.setattr(bootstrap, "load_settings", _settings)
    monkeypatch.setattr(bootstrap, "configure_logging", lambda _level: None)
    monkeypatch.setattr(bootstrap, "start_http_server", ports.append)
    monkeypatch.setattr(bootstrap.asyncio, "get_event_loop", lambda: loop)
    monkeypatch.setattr(bootstrap, "run_hourly", jobs.append)
    monkeypatch.setattr(bootstrap, "log_event", lambda **_event: None)

    bootstrap.start()

    assert ports == [8001]
    assert loop.tasks == 1
    assert loop.drains == 1
    assert len(jobs) == 1
