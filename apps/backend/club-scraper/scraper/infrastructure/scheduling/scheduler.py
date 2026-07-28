"""Schedule club ingestion on the established hourly cadence."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from scraper.observability.logging import log_event


def run_hourly(job: Callable[[], Awaitable[None]]) -> AsyncIOScheduler:
    """Run a coroutine immediately and every sixty minutes thereafter."""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        job,
        "interval",
        minutes=60,
        next_run_time=datetime.now(UTC),
        misfire_grace_time=30,
        replace_existing=True,
    )
    scheduler.start()
    log_event(
        action="scheduler_started",
        level="info",
        message="Scheduler démarré avec succès.",
    )
    return scheduler
