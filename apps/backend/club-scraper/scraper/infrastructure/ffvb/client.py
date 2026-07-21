from __future__ import annotations

import asyncio
from collections.abc import Mapping
from typing import Any

import httpx

from scraper.observability.logging import log_event

ADDRESS_BOOK_URL = "https://www.ffvbbeach.org/ffvbapp/adressier/rech_aff_club.php"


class FfvbClubClient:
    """Fetch FFVB address-book pages with bounded legacy retry semantics."""

    def __init__(self, client: httpx.AsyncClient, max_concurrency: int = 10) -> None:
        self._client = client
        self._semaphore = asyncio.Semaphore(max_concurrency)

    async def fetch_club_page(self, identifier: str) -> str:
        return await self.fetch(ADDRESS_BOOK_URL, {"id_club": identifier})

    async def fetch(
        self,
        url: str,
        form_data: Mapping[str, Any],
        retries: int = 3,
        delay: int = 2,
        timeout: int = 20,
    ) -> str:
        """POST form data with the provider's retry, timeout, and decoding rules."""
        async with self._semaphore:
            for attempt in range(1, retries + 1):
                try:
                    response = await self._client.post(
                        url,
                        data=form_data,
                        timeout=timeout,
                    )
                    response.raise_for_status()
                    encoding = (
                        "windows-1252"
                        if "ffvbbeach.org" in url or "ffvb.org" in url
                        else "utf-8"
                    )
                    content = response.content.decode(encoding, errors="replace")
                    if attempt > 1:
                        log_event(
                            action="http_request_retry_success",
                            level="info",
                            attempt=attempt,
                            url=url,
                            method="POST",
                            message=(
                                f"Succès après retry {attempt}/{retries} pour l'URL {url}."
                            ),
                        )
                    return content
                except httpx.ConnectError as error:
                    self._log_failure(
                        "connector", "error", url, attempt, retries, error
                    )
                except httpx.HTTPStatusError as error:
                    status = error.response.status_code
                    log_event(
                        action="http_request_http_error",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        status=status,
                        error=str(error),
                        message=(
                            f"Erreur HTTP {status} lors du POST '{url}' "
                            f"(tentative {attempt}/{retries})."
                        ),
                    )
                except httpx.TimeoutException as error:
                    self._log_failure(
                        "timeout", "warning", url, attempt, retries, error
                    )
                except Exception as error:
                    self._log_failure(
                        "unexpected", "error", url, attempt, retries, error
                    )

                if attempt < retries:
                    log_event(
                        action="http_request_retry",
                        level="warning",
                        url=url,
                        attempt=attempt,
                        delay=delay,
                        message=f"Nouvelle tentative POST pour '{url}' après {delay} secondes.",
                    )
                    await asyncio.sleep(delay)
                    continue

                log_event(
                    action="http_request_failed",
                    level="error",
                    url=url,
                    attempt=retries,
                    message=f"Échec complet après {retries} tentatives pour '{url}'.",
                )
                raise RuntimeError(
                    f"Échec complet du POST '{url}' après {retries} tentatives."
                )

        raise AssertionError("Provider retry loop ended unexpectedly")

    @staticmethod
    def _log_failure(
        kind: str,
        level: str,
        url: str,
        attempt: int,
        retries: int,
        error: Exception,
    ) -> None:
        labels = {
            "dns": ("dns_error", "Erreur DNS"),
            "connector": ("connector_error", "Erreur de connexion réseau"),
            "timeout": ("timeout", "Timeout"),
            "unexpected": ("unexpected_error", "Erreur inattendue"),
        }
        action, message = labels[kind]
        log_event(
            action=f"http_request_{action}",
            level=level,
            url=url,
            attempt=attempt,
            error=str(error),
            message=f"{message} lors du POST '{url}' (tentative {attempt}/{retries}).",
        )
