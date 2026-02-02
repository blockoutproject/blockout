import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config.logger_config import log_event

PARIS_TZ = ZoneInfo("Europe/Paris")

_last_run: datetime | None = None
_run_lock = asyncio.Lock()


def _paris_now() -> datetime:
    return datetime.now(PARIS_TZ)


def desired_interval_seconds(now: datetime) -> int:
    """
    Règles exemple (faciles à modifier) :

        - Lun-Jeu:
            00:00-12:00 => 30 min
            12:00-23:59 => 60 min

        - Ven:
            00:00-12:00 => 60 min
            12:00-23:59 => 30 min

        - Sam:
            00:00-12:00 => 30 min
            12:00-23:59 => 5 min

        - Dim:
            00:00-23:59 => 5 min
    """
    weekday = now.weekday()

    if weekday == 6:  # Dimanche
        return 30 * 60 if now.hour < 14 else 5 * 60

    if weekday == 5:  # Samedi
        return 30 * 60 if now.hour < 18 else 5 * 60

    if weekday == 4:  # Vendredi
        return 60 * 60 if now.hour < 16 else 30 * 60

    return 60 * 60


async def maybe_run_scraper(scrape_fn):
    """
    Appelée fréquemment (ex: toutes les 60s).
    Lance scrape_fn() uniquement si on a dépassé l'intervalle voulu.
    """
    global _last_run

    now = _paris_now()
    interval = desired_interval_seconds(now)

    async with _run_lock:
        if _last_run is not None:
            elapsed = (now - _last_run).total_seconds()
            if elapsed < interval:
                return

        _last_run = now

    log_event(
        action="scraper_triggered",
        level="info",
        message="Scraper déclenché selon la politique de fréquence.",
        interval_seconds=interval,
        now=str(now),
    )

    await scrape_fn()


def schedule_scraper(scrape_fn):
    """
    Scheduler: évalue la règle toutes les 60 secondes.
    """
    loop = asyncio.get_event_loop()
    scheduler = AsyncIOScheduler(event_loop=loop)

    scheduler.add_job(
        maybe_run_scraper,
        "interval",
        seconds=60,
        kwargs={"scrape_fn": scrape_fn},
        next_run_time=_paris_now(),
        misfire_grace_time=30,
        replace_existing=True,
    )

    scheduler.start()

    log_event(
        action="scheduler_started",
        level="info",
        message="Scheduler démarré (gating toutes les 60s).",
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