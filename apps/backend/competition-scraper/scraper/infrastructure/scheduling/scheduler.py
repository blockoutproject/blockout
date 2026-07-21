from __future__ import annotations

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from zoneinfo import ZoneInfo

from scraper.observability.logging import log_event

PARIS_TZ = ZoneInfo("Europe/Paris")

_last_run: datetime | None = None
_run_lock = asyncio.Lock()


def _paris_now() -> datetime:
    return datetime.now(PARIS_TZ)


def desired_interval_seconds(now: datetime) -> int:
    weekday = now.weekday()
    if weekday == 6:
        return 30 * 60 if now.hour < 14 else 5 * 60
    if weekday == 5:
        return 30 * 60 if now.hour < 17 else 5 * 60
    return 30 * 60


async def maybe_run_scraper(scrape_fn):
    global _last_run

    now = _paris_now()
    interval = desired_interval_seconds(now)

    async with _run_lock:
        if _last_run is not None:
            elapsed = (now - _last_run).total_seconds()
            if elapsed < interval:
                return

    log_event(
        action="scraper_triggered",
        level="info",
        message="Scraper déclenché selon la politique de fréquence.",
        interval_seconds=interval,
        now=str(now),
    )

    ran = await scrape_fn()

    if ran:
        async with _run_lock:
            _last_run = now


def schedule_scraper(scrape_fn):
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        maybe_run_scraper,
        "interval",
        seconds=60,
        kwargs={"scrape_fn": scrape_fn},
        next_run_time=_paris_now(),
        misfire_grace_time=30,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()

    log_event(
        action="scheduler_started",
        level="info",
        message="Scheduler démarré (gating toutes les 60s).",
    )
