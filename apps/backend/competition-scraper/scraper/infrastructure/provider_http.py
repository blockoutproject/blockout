"""Bounded HTTP access shared by FFVB and LNV sources."""

import asyncio

import aiohttp

from scraper.observability.logging import log_event


class ProviderHttpClient:
    """Fetch provider documents with the legacy retry and decoding rules."""

    def __init__(
        self, session: aiohttp.ClientSession, max_concurrency: int = 10
    ) -> None:
        self._session = session
        self._semaphore = asyncio.Semaphore(max_concurrency)

    async def fetch(
        self, url: str, retries: int = 3, delay: int = 5, timeout: int = 20
    ) -> str:
        """Return one decoded provider document after bounded retries."""
        async with self._semaphore:
            for attempt in range(1, retries + 1):
                try:
                    async with self._session.get(
                        url,
                        ssl=False,
                        timeout=aiohttp.ClientTimeout(total=timeout),
                    ) as response:
                        response.raise_for_status()
                        raw_content = await response.content.read()
                        content = self._decode(url, raw_content)
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
                except aiohttp.ClientConnectorDNSError as error:
                    self._log_failure("dns_error", url, attempt, retries, error)
                except aiohttp.ClientConnectorError as error:
                    self._log_failure("connector_error", url, attempt, retries, error)
                except aiohttp.ClientResponseError as error:
                    self._log_failure(
                        "http_error",
                        url,
                        attempt,
                        retries,
                        error,
                        status=error.status,
                        level="debug",
                    )
                except TimeoutError as error:
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

    @staticmethod
    def _decode(url: str, content: bytes) -> str:
        ffvb_prefixes = (
            "http://www.ffvb.org/",
            "http://www.ffvbbeach.org/",
        )
        encoding = "windows-1252" if url.startswith(ffvb_prefixes) else "utf-8"
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
