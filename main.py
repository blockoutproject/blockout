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

# Variable globale pour le token JWT
MIRROR_TOKEN = None
lock = asyncio.Lock()

# Prometheus: durée d'exécution du scraper
execution_duration_gauge = Gauge(
    'scraper_clubs_execution_duration_seconds',
    'Duration of the scraper clubs execution in seconds'
)

SCRAPER_NAME = 'SCRAPER_CLUBS'
SCRAPER_TYPES = ['club']

async def scraper_enabled() -> bool:
    """
    Vérifie via l'API si le scraper est activé.
    """
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10), trust_env=True) as session:
            status = await get_scraper_status(session, SCRAPER_NAME)
            if not status.enabled:
                log_event(
                    action="scraper_skipped",
                    level="warning",
                    message=f"Scraper '{SCRAPER_NAME}' désactivé via API config."
                )
                return False
            return True
    except Exception as e:
        log_event(
            action="scraper_status_fetch_failed",
            level="error",
            message=f"Impossible de récupérer le statut du scraper '{SCRAPER_NAME}'.",
            error=str(e)
        )
        return False

async def run_scraper():
    """
    Exécute le scraping avec verrou.
    (Pas de métrique ici : la durée est mesurée dans main())
    """
    async with lock:
        connector = aiohttp.TCPConnector(limit=20, ssl=False)
        timeout = aiohttp.ClientTimeout(total=60)
        async with aiohttp.ClientSession(timeout=timeout, trust_env=True, connector=connector) as session:
            tasks = []
            for scraper_type in SCRAPER_TYPES:
                current_scraper.set(scraper_type)
                scraper = ScraperFactory.create_scraper(scraper_type, session)
                tasks.append(scraper.scrape())
            await asyncio.gather(*tasks)

async def main():
    """
    Mesure la durée *dans tous les cas* (succès, skip, erreur),
    puis exécute le scraper uniquement si activé.
    """
    start_time = datetime.now(timezone.utc)
    try:
        if await scraper_enabled():
            await run_scraper()
    except Exception as e:
        log_event(
            action="scraping_error",
            level="error",
            message="Erreur lors du scraping",
            error=str(e)
        )
    finally:
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        execution_duration_gauge.set(duration)

def schedule_scraper():
    """
    Planifie l'exécution du scraping toutes les 1 minute.
    """
    loop = asyncio.get_event_loop()
    scheduler = AsyncIOScheduler(event_loop=loop)
    scheduler.add_job(
        main, 
        'interval', 
        minutes=60, 
        next_run_time=datetime.now(timezone.utc),
        misfire_grace_time=30,
        replace_existing=True
    )
    scheduler.start()

    log_event(
        action="scheduler_started",
        level="info",
        message="Scheduler démarré avec succès."
    )

    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        log_event(
            action="scheduler_shutdown",
            level="info",
            message="Scheduler arrêté par l'utilisateur."
        )
        scheduler.shutdown()

if __name__ == "__main__":
    start_http_server(8001)
    loop = asyncio.get_event_loop()

    try:
        loop.create_task(refresh_token_task())
        log_event(
            action="refresh_token_task_started",
            level="info",
            message="Tâche de rafraîchissement de token démarrée."
        )
        schedule_scraper()
    except Exception as e:
        log_event(
            action="startup_error",
            level="error",
            message="Erreur lors du démarrage",
            error=str(e)
        )
    finally:
        loop.run_until_complete(asyncio.sleep(0))