from __future__ import annotations

from typing import Any

import aiohttp

from club_scraper.observability.logging import log_event


async def read_json(response: aiohttp.ClientResponse) -> Any | None:
    """Read a successful internal response or raise its API error."""
    if response.status in {200, 201}:
        if response.content_type == "application/json":
            return await response.json()
        return None
    if response.status == 204:
        return None

    error_data = await _error_data(response)
    message = error_data.get("message", "Erreur non spécifiée par l'API")
    log_event(
        action="api_error", level="error", status=response.status, message=message
    )
    raise RuntimeError(f"Erreur API {response.status}: {message}")


async def _error_data(response: aiohttp.ClientResponse) -> dict[str, Any]:
    try:
        return await response.json()
    except aiohttp.ContentTypeError:
        return {"message": await response.text()}
