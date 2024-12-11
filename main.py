import asyncio
import aiohttp
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone
from scrapers.scraper_factory import ScraperFactory
from config.logger_config import logger
from prometheus_client import Gauge, start_http_server

lock = asyncio.Lock()

# Définir une métrique Prometheus pour la durée d'exécution
execution_duration_gauge = Gauge('scraper_execution_duration_seconds', 'Duration of the scraper execution in seconds')

async def main():
    """
    Fonction principale exécutant le scraping pour les pools nationales, régionales, et pro.
    """
    start_time = datetime.now(timezone.utc)
    async with lock:  
        try:
            logger.debug("Début du scraping...")

            async with aiohttp.ClientSession() as session:
                scraper_types = ['pro', 'national', 'regional']
                tasks = []

                for scraper_type in scraper_types:
                    scraper = ScraperFactory.create_scraper(scraper_type, session)
                    tasks.append(scraper.scrape())

                await asyncio.gather(*tasks)
            
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()

            # Mettre à jour la métrique Prometheus
            execution_duration_gauge.set(duration)
            
            logger.debug(f"Scraping global terminé. Durée de l'exécution: {duration:.2f} secondes.")
        
        except Exception as e:
            logger.error(f"Erreur lors du scraping: {e}")

def schedule_scraper():
    """
    Planifie l'exécution du scraping toutes les 1 minute à l'aide d'APScheduler.
    """
    loop = asyncio.get_event_loop()
    scheduler = AsyncIOScheduler(event_loop=loop)
    scheduler.add_job(main, 'interval', minutes=1, next_run_time=datetime.now(timezone.utc))
    scheduler.start()
    logger.info("Scheduler démarré.")

    # Garder la boucle active
    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()

if __name__ == "__main__":

    start_http_server(8000)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    schedule_scraper()

    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        pass