"""Acquire and refresh the Auth0 service token used by Blockout clients."""

from __future__ import annotations

import asyncio

from auth0.authentication import GetToken

from scraper.config.settings import Settings
from scraper.observability.logging import log_event

_INITIAL_TOKEN_ATTEMPTS = 3
_INITIAL_TOKEN_RETRY_SECONDS = 60
_REFRESH_SECONDS = 172800


class TokenStore:
    """Hold the current machine token shared by internal API clients."""

    def __init__(self) -> None:
        self._token: str | None = None

    def set(self, token: str) -> None:
        self._token = token

    def is_ready(self) -> bool:
        return self._token is not None

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
        """Acquire a token without blocking the application event loop."""
        client = GetToken(
            self._settings.auth0_domain,
            self._settings.auth0_client_id,
            self._settings.auth0_client_secret,
        )
        token = await asyncio.to_thread(
            client.client_credentials,
            self._settings.auth0_audience,
        )
        return token["access_token"]

    async def _refresh(self) -> None:
        self._token_store.set(await self.fetch())
        log_event(
            action="token_refreshed",
            level="info",
            message="Le token a été mis à jour.",
        )

    async def acquire_initial_token(self) -> None:
        """Acquire a usable startup token before any scheduled work can run."""
        for attempt in range(1, _INITIAL_TOKEN_ATTEMPTS + 1):
            try:
                await self._refresh()
                return
            except Exception as error:
                log_event(
                    action="initial_token_error",
                    level=(
                        "error" if attempt == _INITIAL_TOKEN_ATTEMPTS else "warning"
                    ),
                    attempt=attempt,
                    attempts=_INITIAL_TOKEN_ATTEMPTS,
                    error_type=type(error).__name__,
                    message="Impossible d'acquérir le token initial.",
                )
                if attempt == _INITIAL_TOKEN_ATTEMPTS:
                    raise
                await asyncio.sleep(_INITIAL_TOKEN_RETRY_SECONDS)

    async def run(self) -> None:
        """Refresh forever, waiting two days after success and one minute after failure."""
        delay = _REFRESH_SECONDS if self._token_store.is_ready() else 0
        while True:
            try:
                if delay:
                    await asyncio.sleep(delay)
                await self._refresh()
                delay = _REFRESH_SECONDS
            except asyncio.CancelledError:
                raise
            except Exception as error:
                log_event(
                    action="refresh_token_error",
                    level="error",
                    error_type=type(error).__name__,
                    message="Erreur lors de la mise à jour du token.",
                )
                delay = _INITIAL_TOKEN_RETRY_SECONDS


token_store = TokenStore()
