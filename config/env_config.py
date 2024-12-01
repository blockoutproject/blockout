import os

from dotenv import load_dotenv
import os
import sys

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

TEAM_API_URL = os.getenv('TEAM_API_URL')
MATCH_API_URL = os.getenv('MATCH_API_URL')
POOL_API_URL = os.getenv('POOL_API_URL')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
PYTHON_DATASOURCE_URL = os.getenv('PYTHON_DATASOURCE_URL')
