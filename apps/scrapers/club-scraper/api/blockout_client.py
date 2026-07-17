from __future__ import annotations

from dataclasses import dataclass
import inspect
import json
from typing import Any, Awaitable, Callable


TokenSupplier = Callable[[], str | Awaitable[str]]
STATUS_TIMEOUT_SECONDS = 10
RUN_TIMEOUT_SECONDS = 60
CONNECTION_LIMIT = 20
_SENSITIVE_KEYS = {"access_token", "authorization", "client_secret", "token"}


@dataclass(frozen=True)
class BlockoutApiError(RuntimeError):
    status: int | None
    code: str | None
    request_id: str | None
    safe_body: str | None

    def __str__(self) -> str:
        return f"Blockout API request failed (status={self.status}, code={self.code}, requestId={self.request_id})"

    @classmethod
    def from_generated(cls, error: Exception) -> "BlockoutApiError":
        status = getattr(error, "status", None) or getattr(error, "status_code", None)
        body = getattr(error, "body", None)
        headers = getattr(error, "headers", None) or {}
        payload = _safe_payload(body)
        code = payload.get("code") if isinstance(payload, dict) else None
        request_id = payload.get("requestId") if isinstance(payload, dict) else None
        request_id = request_id or headers.get("X-Request-Id") or headers.get("x-request-id")
        safe_body = json.dumps(payload, separators=(",", ":"))[:2048] if payload is not None else None
        return cls(status=status, code=code, request_id=request_id, safe_body=safe_body)


class BlockoutClientSession:
    def __init__(self, configuration: Any, api_client: Any, token_supplier: TokenSupplier, timeout: int):
        self.configuration = configuration
        self.api_client = api_client
        self._token_supplier = token_supplier
        self.timeout = timeout

    @classmethod
    def create(
        cls,
        configuration_type: type[Any],
        api_client_type: type[Any],
        host: str,
        token_supplier: TokenSupplier,
        timeout: int,
    ) -> "BlockoutClientSession":
        configuration = configuration_type(
            host=host,
            verify_ssl=False,
            connection_pool_maxsize=CONNECTION_LIMIT,
        )
        return cls(configuration, api_client_type(configuration), token_supplier, timeout)

    async def __aenter__(self) -> "BlockoutClientSession":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        await self.close()

    async def invoke(self, operation: Callable[..., Awaitable[Any]], *args: Any, **kwargs: Any) -> Any:
        token = self._token_supplier()
        self.configuration.access_token = await token if inspect.isawaitable(token) else token
        kwargs.setdefault("_request_timeout", self.timeout)
        try:
            return await operation(*args, **kwargs)
        except BlockoutApiError:
            raise
        except Exception as error:
            raise BlockoutApiError.from_generated(error) from error

    async def close(self) -> None:
        await self.api_client.close()


def create_status_client(
    configuration_type: type[Any], api_client_type: type[Any], host: str, token_supplier: TokenSupplier
) -> BlockoutClientSession:
    return BlockoutClientSession.create(
        configuration_type, api_client_type, host, token_supplier, STATUS_TIMEOUT_SECONDS
    )


def create_run_client(
    configuration_type: type[Any], api_client_type: type[Any], host: str, token_supplier: TokenSupplier
) -> BlockoutClientSession:
    return BlockoutClientSession.create(configuration_type, api_client_type, host, token_supplier, RUN_TIMEOUT_SECONDS)


def _safe_payload(body: Any) -> dict[str, Any] | str | None:
    if body is None:
        return None
    if isinstance(body, bytes):
        body = body.decode("utf-8", errors="replace")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            return body[:2048]
    if isinstance(body, dict):
        return {
            key: _sanitize(value)
            for key, value in body.items()
            if key.lower() not in _SENSITIVE_KEYS
        }
    return str(body)[:2048]


def _sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _sanitize(item)
            for key, item in value.items()
            if key.lower() not in _SENSITIVE_KEYS
        }
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return value
