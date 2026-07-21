# file: utils/handlers/api_handler.py
from __future__ import annotations

import aiohttp
from dataclasses import fields
from datetime import datetime
from enum import Enum
from functools import wraps
from typing import get_args, get_origin

from scraper.observability.logging import log_event


def handle_api_response(response_type: type | None = None):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                response = await func(*args, **kwargs)

                if not isinstance(response, aiohttp.ClientResponse):
                    raise TypeError(
                        f"La fonction {func.__name__} doit retourner une réponse HTTP valide (ClientResponse), "
                        f"mais a retourné {type(response)}."
                    )

                return await process_response(
                    response, response_type, func.__name__, args, kwargs
                )

            except Exception as e:
                log_event(
                    action="api_response_error",
                    level="error",
                    function=func.__name__,
                    args=str(args),
                    kwargs=str(kwargs),
                    error=repr(e),
                )
                raise

        return wrapper

    return decorator


async def process_response(
    response: aiohttp.ClientResponse,
    response_type: type | None,
    func_name: str,
    args,
    kwargs,
) -> dict | object | None:
    url = str(response.url)
    status = response.status
    content_type = response.headers.get("Content-Type", "")

    if status in {200, 201}:
        if response.content_type == "application/json":
            json_data = await response.json()
            if response_type:
                if get_origin(response_type) is list:
                    item_type = get_args(response_type)[0]
                    return [convert_to_dataclass(item, item_type) for item in json_data]
                return convert_to_dataclass(json_data, response_type)
            return json_data
        await response.release()
        return None

    if status == 204:
        if get_origin(response_type) is list:
            return []
        return None

    error_data = await get_error_data(response)
    error_message = (
        (error_data.get("message") if isinstance(error_data, dict) else None)
        or (error_data.get("error") if isinstance(error_data, dict) else None)
        or "Erreur non spécifiée par l'API"
    )

    log_event(
        action="api_error",
        level="error",
        function=func_name,
        url=url,
        status=status,
        content_type=content_type,
        body=error_data,
        args=str(args),
        kwargs=str(kwargs),
        message=error_message,
    )

    raise RuntimeError(f"Erreur API {status} sur {url}: {error_message}")


async def get_error_data(response: aiohttp.ClientResponse) -> object:
    try:
        if response.content_type == "application/json":
            return await response.json()
        return await response.text()
    except aiohttp.ContentTypeError:
        return await response.text()
    except Exception as e:
        return {"message": "Impossible de lire le body d'erreur", "error": repr(e)}


def convert_to_dataclass(data: dict, cls: type) -> object:
    if not hasattr(cls, "__dataclass_fields__"):
        error_message = f"{cls} n'est pas une dataclass."
        log_event(
            action="convert_to_dataclass_error",
            level="error",
            data=data,
            target_class=getattr(cls, "__name__", str(cls)),
            message=error_message,
        )
        raise ValueError(error_message)

    init_args = {}
    for field in fields(cls):
        field_name = field.name
        field_type = field.type
        value = data.get(field_name)

        if value is not None:
            try:
                value = convert_field_value(value, field_type)
            except Exception as e:
                log_event(
                    action="field_conversion_error",
                    level="error",
                    field=field_name,
                    value=value,
                    target_class=cls.__name__,
                    error=repr(e),
                )
                raise

        init_args[field_name] = value

    return cls(**init_args)


def convert_field_value(value: any, field_type: type) -> any:
    if isinstance(field_type, type) and issubclass(field_type, Enum):
        return field_type(value)
    if (field_type == datetime or field_type == datetime | None) and isinstance(
        value, str
    ):
        return datetime.fromisoformat(value)
    return value
