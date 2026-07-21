"""Bounded HTTP access shared by FFVB and LNV sources."""

import asyncio
import re
from collections.abc import Mapping

import httpx

from scraper.observability.logging import log_event


class ProviderHttpClient:
    """Fetch provider documents with bounded retries and declared encodings."""

    def __init__(self, client: httpx.AsyncClient, max_concurrency: int = 10) -> None:
        self._client = client
        self._semaphore = asyncio.Semaphore(max_concurrency)

    async def fetch(
        self, url: str, retries: int = 3, delay: int = 5, timeout: int = 20
    ) -> str:
        """Return one decoded provider document after bounded retries."""
        async with self._semaphore:
            for attempt in range(1, retries + 1):
                try:
                    response = await self._client.get(url, timeout=timeout)
                    response.raise_for_status()
                    content = self._decode(
                        url, response.content, response.charset_encoding
                    )
                    if attempt > 1:
                        log_event(
                            action="http_request_retry_success",
                            level="info",
                            attempt=attempt,
                            url=url,
                            message=(
                                f"Succès après retry {attempt}/{retries}: "
                                f"Contenu récupéré pour l'URL {url}."
                            ),
                        )
                    return content
                except httpx.ConnectError as error:
                    self._log_failure("connector_error", url, attempt, retries, error)
                except httpx.HTTPStatusError as error:
                    self._log_failure(
                        "http_error",
                        url,
                        attempt,
                        retries,
                        error,
                        status=error.response.status_code,
                        level="debug",
                    )
                except httpx.TimeoutException as error:
                    self._log_failure(
                        "timeout", url, attempt, retries, error, level="debug"
                    )
                except Exception as error:
                    self._log_failure("unexpected_error", url, attempt, retries, error)

                if attempt < retries:
                    log_event(
                        action="http_request_retry",
                        level="debug",
                        url=url,
                        attempt=attempt,
                        delay=delay,
                        message=(
                            f"Nouvelle tentative pour l'URL '{url}' après un délai "
                            f"de {delay} secondes."
                        ),
                    )
                    await asyncio.sleep(delay)
                    continue

                log_event(
                    action="http_request_failed",
                    level="error",
                    url=url,
                    attempt=retries,
                    message=(
                        f"Échec complet après {retries} tentatives pour l'URL '{url}'."
                    ),
                )
                raise RuntimeError(
                    f"Échec complet pour l'URL '{url}' après {retries} tentatives."
                )

        raise RuntimeError(f"No provider request was attempted for '{url}'.")

    async def post_form(
        self,
        url: str,
        data: Mapping[str, str],
        timeout: int = 20,
    ) -> httpx.Response:
        """POST one provider form while the caller owns retry semantics."""
        response = await self._client.post(url, data=data, timeout=timeout)
        response.raise_for_status()
        return response

    @staticmethod
    def _decode(url: str, content: bytes, declared_encoding: str | None = None) -> str:
        """Decode with HTTP/meta declarations before the provider fallback."""
        if declared_encoding:
            try:
                return content.decode(declared_encoding, errors="replace")
            except LookupError:
                pass
        if content.startswith(b"\xef\xbb\xbf"):
            return content.decode("utf-8-sig", errors="replace")
        match = re.search(
            rb"charset\s*=\s*[\"']?([A-Za-z0-9._-]+)", content[:4096], re.I
        )
        if match:
            try:
                return content.decode(match.group(1).decode("ascii"), errors="replace")
            except LookupError:
                pass
        encoding = "windows-1252" if "ffvbbeach.org" in url else "utf-8"
        return content.decode(encoding, errors="replace")

    @staticmethod
    def _log_failure(
        kind: str,
        url: str,
        attempt: int,
        retries: int,
        error: Exception,
        *,
        status: int | None = None,
        level: str = "error",
    ) -> None:
        details = {
            "action": f"http_request_{kind}",
            "level": level,
            "url": url,
            "attempt": attempt,
            "error": str(error),
            "message": (
                f"Provider request failed for '{url}' (attempt {attempt}/{retries})."
            ),
        }
        if status is not None:
            details["status"] = status
        log_event(**details)
