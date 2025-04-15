import asyncio
import aiohttp

from scrapers.club_scraper import ClubScraper

async def main():
    # Liste d'IDs de clubs valides (tu peux en mettre 1 ou 2 pour tester)
    club_ids = ["0660037"]  # à adapter avec des vrais IDs si possible

    async with aiohttp.ClientSession() as session:
        scraper = ClubScraper(session)
        await scraper.run_scraping(club_ids)

if __name__ == "__main__":
    asyncio.run(main())