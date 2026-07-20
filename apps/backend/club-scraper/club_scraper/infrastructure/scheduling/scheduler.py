from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from club_scraper.observability.logging import log_event


def run_hourly(job: Callable[[], Awaitable[None]]) -> None:
    """Run a coroutine immediately and every sixty minutes thereafter."""
    loop = asyncio.get_event_loop()
    scheduler = AsyncIOScheduler(event_loop=loop)
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

    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        log_event(
            action="scheduler_shutdown",
            level="info",
            message="Scheduler arrêté par l'utilisateur.",
        )
        scheduler.shutdown()
