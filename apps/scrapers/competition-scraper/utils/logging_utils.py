from dataclasses import is_dataclass, asdict
from enum import Enum
from datetime import datetime, date
from typing import Any

def _sanitize_for_json(value: Any):
    """Convertit récursivement en types JSON-compatibles."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        # selon ton besoin: value.value ou value.name
        return value.value if hasattr(value, "value") else value.name
    if isinstance(value, (list, tuple, set)):
        return [_sanitize_for_json(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _sanitize_for_json(v) for k, v in value.items()}
    if is_dataclass(value):
        return _sanitize_for_json(asdict(value))
    if hasattr(value, "__dict__"):
        # évite les attributs privés et non-sérialisables
        public = {k: v for k, v in vars(value).items() if not k.startswith("_")}
        return _sanitize_for_json(public)
    # fallback
    return str(value)

def to_loggable(obj: Any):
    """Point d’entrée public pour sérialiser en payload JSON-safe."""
    return _sanitize_for_json(obj)