from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any


def _sanitize_for_json(value: Any) -> Any:
    """Recursively convert a value into JSON-compatible types."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value if hasattr(value, "value") else value.name
    if isinstance(value, (list, tuple, set)):
        return [_sanitize_for_json(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _sanitize_for_json(v) for k, v in value.items()}
    if is_dataclass(value):
        return _sanitize_for_json(asdict(value))
    if hasattr(value, "__dict__"):
        public = {k: v for k, v in vars(value).items() if not k.startswith("_")}
        return _sanitize_for_json(public)
    return str(value)


def to_loggable(obj: Any) -> Any:
    """Return a JSON-safe representation for structured logging."""
    return _sanitize_for_json(obj)
