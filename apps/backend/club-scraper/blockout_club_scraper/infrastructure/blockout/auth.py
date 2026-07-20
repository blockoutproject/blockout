from __future__ import annotations

import asyncio

from auth0.authentication import GetToken

from blockout_club_scraper.config.settings import Settings
from blockout_club_scraper.observability.logging import log_event


class TokenStore:
    """Hold the current machine token shared by internal API clients."""

    def __init__(self) -> None:
        self._token: str | None = None

    def set(self, token: str) -> None:
        self._token = token

    def get(self) -> str:
        if self._token is None:
            raise ValueError("Le token n'est pas encore défini.")
        return self._token

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.get()}"}


class Auth0TokenRefresher:
    """Refresh the Auth0 client-credentials token at the legacy cadence."""

    def __init__(self, settings: Settings, token_store: TokenStore) -> None:
        self._settings = settings
        self._token_store = token_store

    async def fetch(self) -> str:
        client = GetToken(
            self._settings.auth0_domain,
            self._settings.auth0_client_id,
            self._settings.auth0_client_secret,
        )
        token = client.client_credentials(self._settings.auth0_audience)
        return token["access_token"]

    async def run(self) -> None:
        """Refresh forever, waiting two days after success and one minute after failure."""
        while True:
            try:
                self._token_store.set(await self.fetch())
                log_event(
                    action="token_refreshed",
                    level="info",
                    message="Le token a été mis à jour.",
                )
                await asyncio.sleep(172800)
            except asyncio.CancelledError:
                raise
            except Exception as error:
                log_event(
                    action="refresh_token_error",
                    level="error",
                    error=str(error),
                    message="Erreur lors de la mise à jour du token.",
                )
                await asyncio.sleep(60)


token_store = TokenStore()
