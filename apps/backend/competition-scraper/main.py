"""Start the competition scraper."""

import asyncio

from scraper.bootstrap import app

if __name__ == "__main__":
    try:
        asyncio.run(app())
    except KeyboardInterrupt:
        pass
