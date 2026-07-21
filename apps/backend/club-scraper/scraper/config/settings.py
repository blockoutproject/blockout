from __future__ import annotations

import os
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime settings read from the selected environment file."""

    team_api_url: str | None
    competition_api_url: str | None
    club_api_url: str | None
    config_api_url: str | None
    log_level: str
    auth0_domain: str | None
    auth0_client_id: str | None
    auth0_client_secret: str | None
    auth0_audience: str | None


def load_settings(arguments: Sequence[str] | None = None) -> Settings:
    """Load the same environment file selected by the imported application."""
    arguments = sys.argv if arguments is None else arguments
    environment_file = _environment_file(arguments)
    print(f"Chargement des variables depuis {environment_file}")
    load_dotenv(Path(environment_file), override=True)

    return Settings(
        team_api_url=os.getenv("TEAM_API_URL"),
        competition_api_url=os.getenv("COMPETITION_API_URL"),
        club_api_url=os.getenv("CLUB_API_URL"),
        config_api_url=os.getenv("CONFIG_API_URL"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        auth0_domain=os.getenv("AUTH0_DOMAIN"),
        auth0_client_id=os.getenv("AUTH0_CLIENT_ID"),
        auth0_client_secret=os.getenv("AUTH0_CLIENT_SECRET"),
        auth0_audience=os.getenv("AUTH0_AUDIENCE"),
    )


def _environment_file(arguments: Sequence[str]) -> str:
    if len(arguments) <= 1:
        return ".env"
    if arguments[1] == "dev":
        return ".env.dev"
    if arguments[1] == "local":
        return ".env.local"
    return ".env"
