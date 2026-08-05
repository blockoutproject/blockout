"""Acquire and refresh the Auth0 service token used by Blockout clients."""

from __future__ import annotations

import asyncio
import time

from auth0.authentication import GetToken

from scraper.config.settings import (
    AUTH0_AUDIENCE,
    AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET,
    AUTH0_DOMAIN,
)
from scraper.observability.logging import log_event

M2M_ENABLED = True

_MIRROR_TOKEN: str | None = ""
_TOKEN_EXP_EPOCH: float = float("inf")
_TOKEN_LOCK = asyncio.Lock()

_REFRESH_SAFETY_SECONDS = 5 * 60


def set_token(token: str, expires_in: int):
    global _MIRROR_TOKEN, _TOKEN_EXP_EPOCH
    _MIRROR_TOKEN = token
    _TOKEN_EXP_EPOCH = time.time() + int(expires_in)


def get_token() -> str:
    return "" if not M2M_ENABLED else (_MIRROR_TOKEN or "")


def _get_headers() -> dict:
    if not M2M_ENABLED:
        return {}
    token = get_token()
    return {"Authorization": f"Bearer {token}"} if token else {}


async def fetch_auth0_token() -> tuple[str, int]:
    """Acquire a token without blocking the application event loop."""
    get_token_client = GetToken(AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET)
    token = await asyncio.to_thread(
        get_token_client.client_credentials,
        AUTH0_AUDIENCE,
    )
    return token["access_token"], int(token.get("expires_in", 3600))


async def ensure_token() -> None:
    global _MIRROR_TOKEN, _TOKEN_EXP_EPOCH

    if not M2M_ENABLED:
        return

    now = time.time()
    if _MIRROR_TOKEN and now < (_TOKEN_EXP_EPOCH - _REFRESH_SAFETY_SECONDS):
        return

    async with _TOKEN_LOCK:
        now = time.time()
        if _MIRROR_TOKEN and now < (_TOKEN_EXP_EPOCH - _REFRESH_SAFETY_SECONDS):
            return

        token, expires_in = await fetch_auth0_token()
        set_token(token, expires_in)
        log_event(
            action="token_fetched",
            level="info",
            message="Token M2M récupéré / mis à jour (cache).",
            expires_in_seconds=expires_in,
        )


async def refresh_token_task() -> None:
    while True:
        try:
            if not M2M_ENABLED:
                await asyncio.sleep(3600)
                continue

            await ensure_token()
            sleep_for = max(
                30, int(_TOKEN_EXP_EPOCH - time.time() - _REFRESH_SAFETY_SECONDS)
            )
            await asyncio.sleep(sleep_for)

        except Exception as e:
            log_event(
                action="refresh_token_error",
                level="error",
                error_type=type(e).__name__,
                message="Erreur lors de la mise à jour du token.",
            )
            await asyncio.sleep(60)
