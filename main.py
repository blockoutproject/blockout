import asyncio
import aiohttp
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone
from api.auth0 import refresh_token_task
from api.config_api import get_scraper_status
from config.logger_config import log_event
from scrapers.scraper_factory import ScraperFactory
from prometheus_client import Gauge, start_http_server
from contextvars import ContextVar

# Définir une variable contextuelle pour le scraper actuel
current_scraper = ContextVar("current_scraper", default="global_scraper")

# Variable globale pour stocker le token JWT
MIRROR_TOKEN = None
lock = asyncio.Lock()

# Définir une métrique Prometheus pour la durée d'exécution
execution_duration_gauge = Gauge(
    "scraper_execution_duration_seconds",
    "Duration of the scraper execution in seconds",
)

async def _run_one_scraper(session: aiohttp.ClientSession, scraper_type: str):
    """
    Lance un scraper unique.
    """
    current_scraper.set(scraper_type)
    scraper = ScraperFactory.create_scraper(scraper_type, session)
    await scraper.scrape()

async def run_scrapers_with_max_concurrency(
    session: aiohttp.ClientSession,
    scraper_types: list[str],
    max_concurrency: int = 2,
):
    """
    Lance les scrapers avec une concurrence maximale.
    Exemple: max_concurrency=2
        - démarre pro + national
        - dès qu'un finit, démarre regional
        - dès qu'un finit, démarre departmental
    """
    pending_types = list(scraper_types)
    running: set[asyncio.Task] = set()

    # Bootstrap: on démarre jusqu'à max_concurrency
    while pending_types and len(running) < max_concurrency:
        st = pending_types.pop(0)
        running.add(asyncio.create_task(_run_one_scraper(session, st)))

    # Chaque fois qu'une tâche se termine, on démarre la suivante
    while running:
        done, running = await asyncio.wait(
            running,
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Remonte l'exception si une task a crash (et stop le run)
        for t in done:
            t.result()

        while pending_types and len(running) < max_concurrency:
            st = pending_types.pop(0)
            running.add(asyncio.create_task(_run_one_scraper(session, st)))

async def main():
    start_time = datetime.now(timezone.utc)
    skipped = False

    try:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            trust_env=True,
        ) as tmp_session:
            try:
                status = await get_scraper_status(tmp_session, "SCRAPER")
                if not status.enabled:
                    log_event(
                        action="scraper_skipped",
                        level="warning",
                        message="Scraper 'SCRAPER' désactivé via API config.",
                    )
                    skipped = True
            except Exception as e:
                log_event(
                    action="scraper_status_fetch_failed",
                    level="error",
                    message="Impossible de récupérer le statut du scraper 'SCRAPER'.",
                    error=str(e),
                )
                skipped = True

        if not skipped:
            async with lock:
                connector = aiohttp.TCPConnector(limit=20, ssl=False)
                timeout = aiohttp.ClientTimeout(total=10)

                async with aiohttp.ClientSession(
                    timeout=timeout,
                    trust_env=True,
                    connector=connector,
                ) as session:
                    scraper_types = ["departmental", "national", "pro", "regional"]

                    await run_scrapers_with_max_concurrency(
                        session=session,
                        scraper_types=scraper_types,
                        max_concurrency=2,
                    )

    except Exception as e:
        log_event(
            action="scraping_error",
            level="error",
            message="Erreur lors du scraping",
            error=str(e),
        )
    finally:
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        execution_duration_gauge.set(duration)

def schedule_scraper():
    """
    Planifie l'exécution du scraping toutes les 2 minutes à l'aide d'APScheduler.
    """
    loop = asyncio.get_event_loop()
    scheduler = AsyncIOScheduler(event_loop=loop)
    scheduler.add_job(
        main,
        "interval",
        minutes=3,
        next_run_time=datetime.now(timezone.utc),
        misfire_grace_time=30,
        replace_existing=True,
    )
    scheduler.start()

    log_event(
        action="scheduler_started",
        level="info",
        message="Scheduler démarré avec succès.",
    )

    # Garder la boucle active
    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        log_event(
            action="scheduler_shutdown",
            level="info",
            message="Scheduler arrêté par l'utilisateur.",
        )
        scheduler.shutdown()

if __name__ == "__main__":
    start_http_server(8000)
    loop = asyncio.get_event_loop()

    try:
        # Démarre la tâche de rafraîchissement du token en arrière-plan
        loop.create_task(refresh_token_task())
        log_event(
            action="refresh_token_task_started",
            level="info",
            message="Tâche de rafraîchissement de token démarrée.",
        )
        schedule_scraper()
    except Exception as e:
        log_event(
            action="startup_error",
            level="error",
            message="Erreur lors du démarrage",
            error=str(e),
        )
    finally:
        loop.run_until_complete(asyncio.sleep(0))