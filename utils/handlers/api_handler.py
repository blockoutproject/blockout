from functools import wraps
from typing import Optional, Type, Union, get_args, get_origin
from datetime import datetime
from enum import Enum
from dataclasses import fields
import aiohttp
from config.logger_config import log_event

def handle_api_response(response_type: Optional[Type] = None):
    """
    Décorateur pour analyser les réponses API et convertir en dataclass
    avec prise en charge des énumérations et datetime.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Optional[Union[dict, object]]:
            try:
                response: aiohttp.ClientResponse = await func(*args, **kwargs)
                return await process_response(response, response_type)
            except Exception as e:
                log_event(
                    action="api_response_error",
                    level="error",
                    function=func.__name__,
                    args=str(args),
                    kwargs=str(kwargs),
                    error=str(e)
                )
                raise
        return wrapper
    return decorator

async def process_response(response: aiohttp.ClientResponse, response_type: Optional[Type]) -> Optional[Union[dict, object]]:
    """
    Traite la réponse de l'API et convertit en dataclass si nécessaire.
    """
    if response.status in {200, 201}:
        if response.content_type == "application/json":
            json_data = await response.json()
            if response_type:
                if get_origin(response_type) is list:
                    item_type = get_args(response_type)[0]
                    return [convert_to_dataclass(item, item_type) for item in json_data]
                return convert_to_dataclass(json_data, response_type)
            return json_data
        return None

    elif response.status == 204:
        if get_origin(response_type) is list:
            return []
        return None

    else:
        error_data = await get_error_data(response)
        error_message = error_data.get("message", "Erreur non spécifiée par l'API")
        log_event(
            action="api_error",
            level="error",
            status=response.status,
            message=error_message
        )
        raise Exception(f"Erreur API {response.status}: {error_message}")

async def get_error_data(response: aiohttp.ClientResponse) -> dict:
    """
    Récupère les données d'erreur de la réponse de l'API.
    """
    try:
        return await response.json()
    except aiohttp.ContentTypeError:
        return {"message": await response.text()}

def convert_to_dataclass(data: dict, cls: Type) -> object:
    """
    Convertit un dictionnaire en instance de dataclass, en gérant
    les champs Enum, datetime, et autres types complexes.
    """
    if not hasattr(cls, "__dataclass_fields__"):
        error_message = f"{cls} n'est pas une dataclass."
        log_event(
            action="convert_to_dataclass_error",
            level="error",
            data=data,
            target_class=cls.__name__,
            message=error_message
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
                    error=str(e)
                )
                raise

        init_args[field_name] = value

    return cls(**init_args)

def convert_field_value(value: any, field_type: Type) -> any:
    """
    Convertit la valeur d'un champ en fonction de son type.
    """
    if isinstance(field_type, type) and issubclass(field_type, Enum):
        return field_type(value)
    elif (field_type == datetime or field_type == Optional[datetime]) and isinstance(value, str):
        return datetime.fromisoformat(value)
    return value