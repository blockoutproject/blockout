import asyncio
from dataclasses import replace

import pytest

import api.auth0 as auth0
import main as club_main
import models.scraper as scraper_module
from models.club import Club
from models.scraper import Scraper
from models.scraper_status import ScraperStatus


class DummyScraper(Scraper):
    """Minimal legacy scraper used to characterize the shared runtime base."""

    def __init__(self, session) -> None:
        super().__init__(session=session, name="dummy", max_concurrency=2)
        self.received_ids: list[str] | None = None

    async def run_scraping(self, club_ids) -> None:
        """Record the identifiers forwarded by the shared scrape lifecycle."""
        self.received_ids = club_ids


class _Content:
    def __init__(self, body: bytes) -> None:
        self.body = body

    async def read(self) -> bytes:
        """Return the configured provider bytes."""
        return self.body


class _Response:
    def __init__(self, body: bytes) -> None:
        self.content = _Content(body)

    def raise_for_status(self) -> None:
        """Represent a successful provider response."""


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
        """Record a provider POST and return its scripted async context."""
        self.calls.append({"url": url, **kwargs})
        return _Context(self.results.pop(0))


class _Gauge:
    def __init__(self) -> None:
        self.values: list[float] = []

    def set(self, value: float) -> None:
        """Record an observed Prometheus gauge value."""
        self.values.append(value)


def _club(identifier: str) -> Club:
    """Build an existing owner response for cache characterization."""
    return Club(id=identifier, rawName=f"RAW {identifier}", name=identifier)


def test_shared_scrape_loads_owner_cache_before_provider_ids(monkeypatch) -> None:
    """Protect the ordering and clone semantics of the shared scrape lifecycle."""
    async def scenario() -> None:
        order: list[str] = []

        async def get_clubs(_session):
            order.append("clubs")
            return [_club("club-1")]

        async def get_ids(_session):
            order.append("ids")
            return ["club-1"]

        scraper = DummyScraper(session=object())
        scraper.scraping_duration_gauge = _Gauge()
        original_run = scraper.run_scraping

        async def run(ids):
            order.append("provider")
            await original_run(ids)

        monkeypatch.setattr(scraper_module, "get_all_clubs", get_clubs)
        monkeypatch.setattr(scraper_module, "get_unique_club_ids", get_ids)
        monkeypatch.setattr(scraper, "run_scraping", run)

        await scraper.scrape()

        existing, candidate = scraper._clubs_cache["club-1"]
        assert order == ["clubs", "ids", "provider"]
        assert existing == candidate
        assert existing is not candidate
        assert scraper.received_ids == ["club-1"]
        assert len(scraper.scraping_duration_gauge.values) == 1

    asyncio.run(scenario())


def test_fetch_decodes_ffvb_as_windows_1252() -> None:
    """Protect the provider-specific encoding used by the address book."""
    async def scenario() -> None:
        session = _ScriptedSession([_Response(b"caf\xe9")])
        scraper = DummyScraper(session)

        result = await scraper.fetch("https://www.ffvbbeach.org/address", {"id": "1"})

        assert result == "café"
        assert session.calls[0]["ssl"] is False
        assert session.calls[0]["timeout"].total == 20

    asyncio.run(scenario())


def test_fetch_retries_three_times_with_the_configured_delay(monkeypatch) -> None:
    """Protect retry count, delay, and eventual success."""
    async def scenario() -> None:
        session = _ScriptedSession([asyncio.TimeoutError(), asyncio.TimeoutError(), _Response(b"ok")])
        scraper = DummyScraper(session)
        sleeps: list[int] = []

        async def sleep(delay: int) -> None:
            sleeps.append(delay)

        monkeypatch.setattr(scraper_module.asyncio, "sleep", sleep)
        monkeypatch.setattr(scraper_module, "log_event", lambda **_event: None)

        result = await scraper.fetch("https://provider.invalid", {}, retries=3, delay=2)

        assert result == "ok"
        assert len(session.calls) == 3
        assert sleeps == [2, 2]

    asyncio.run(scenario())


def test_fetch_raises_after_the_final_failed_attempt(monkeypatch) -> None:
    """Protect terminal failure after all provider retries are exhausted."""
    async def scenario() -> None:
        session = _ScriptedSession([asyncio.TimeoutError(), asyncio.TimeoutError(), asyncio.TimeoutError()])
        scraper = DummyScraper(session)

        async def sleep(_delay: int) -> None:
            return None

        monkeypatch.setattr(scraper_module.asyncio, "sleep", sleep)
        monkeypatch.setattr(scraper_module, "log_event", lambda **_event: None)

        with pytest.raises(Exception, match="3 tentatives"):
            await scraper.fetch("https://provider.invalid", {}, retries=3)

        assert len(session.calls) == 3

    asyncio.run(scenario())


def test_scraper_enabled_fails_closed_when_config_is_unavailable(monkeypatch) -> None:
    """Protect the current safety behavior that skips ingestion on status failure."""
    async def scenario() -> None:
        class Session:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

        async def fail(_session, _name):
            raise RuntimeError("config unavailable")

        events: list[dict] = []
        monkeypatch.setattr(club_main.aiohttp, "ClientSession", lambda **_kwargs: Session())
        monkeypatch.setattr(club_main, "get_scraper_status", fail)
        monkeypatch.setattr(club_main, "log_event", lambda **event: events.append(event))

        assert await club_main.scraper_enabled() is False
        assert events[-1]["action"] == "scraper_status_fetch_failed"

    asyncio.run(scenario())


def test_main_measures_skipped_runs_without_starting_the_scraper(monkeypatch) -> None:
    """Protect duration observation for the disabled status path."""
    async def scenario() -> None:
        gauge = _Gauge()

        async def disabled() -> bool:
            return False

        async def unexpected() -> None:
            raise AssertionError("Disabled scraper must not run")

        monkeypatch.setattr(club_main, "scraper_enabled", disabled)
        monkeypatch.setattr(club_main, "run_scraper", unexpected)
        monkeypatch.setattr(club_main, "execution_duration_gauge", gauge)

        await club_main.main()

        assert len(gauge.values) == 1
        assert gauge.values[0] >= 0

    asyncio.run(scenario())


def test_scheduler_registers_the_existing_hourly_job(monkeypatch) -> None:
    """Protect interval, eager first run, misfire grace, and replacement semantics."""
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

    loop = Loop()
    scheduler = Scheduler(loop)
    monkeypatch.setattr(club_main.asyncio, "get_event_loop", lambda: loop)
    monkeypatch.setattr(club_main, "AsyncIOScheduler", lambda event_loop: scheduler)
    monkeypatch.setattr(club_main, "log_event", lambda **_event: None)

    club_main.schedule_scraper()

    args, kwargs = scheduler.job
    assert args == (club_main.main, "interval")
    assert kwargs["minutes"] == 60
    assert kwargs["misfire_grace_time"] == 30
    assert kwargs["replace_existing"] is True
    assert kwargs["next_run_time"].tzinfo is not None
    assert scheduler.started is True


def test_auth0_refresh_keeps_the_token_for_172800_seconds(monkeypatch) -> None:
    """Protect the current successful refresh cadence and global token visibility."""
    async def scenario() -> None:
        sleeps: list[int] = []

        async def fetch() -> str:
            return "service-token"

        async def sleep(delay: int) -> None:
            sleeps.append(delay)
            raise asyncio.CancelledError

        monkeypatch.setattr(auth0, "fetch_auth0_token", fetch)
        monkeypatch.setattr(auth0.asyncio, "sleep", sleep)
        monkeypatch.setattr(auth0, "log_event", lambda **_event: None)

        with pytest.raises(asyncio.CancelledError):
            await auth0.refresh_token_task()

        assert auth0.get_token() == "service-token"
        assert sleeps == [172800]

    asyncio.run(scenario())
