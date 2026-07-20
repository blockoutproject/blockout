import os
import sys

from dotenv import load_dotenv


def load_environment():
    env_file = ".env"
    if len(sys.argv) > 1:
        if sys.argv[1] == "dev":
            env_file = ".env.dev"
        elif sys.argv[1] == "local":
            env_file = ".env.local"
    print(f"Chargement des variables depuis {env_file}")
    load_dotenv(env_file, override=True)


load_environment()

TEAM_API_URL = os.getenv("TEAM_API_URL")
MATCH_API_URL = os.getenv("MATCH_API_URL")
POOL_API_URL = os.getenv("POOL_API_URL")
COMPETITION_API_URL = os.getenv("COMPETITION_API_URL")
CONFIG_API_URL = os.getenv("CONFIG_API_URL")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID")
AUTH0_CLIENT_SECRET = os.getenv("AUTH0_CLIENT_SECRET")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
SCRAPERS_ENV = os.getenv("SCRAPERS", "regional,departmental,national,pro")

SCRAPER_TYPES = [s.strip() for s in SCRAPERS_ENV.split(",") if s.strip()]
