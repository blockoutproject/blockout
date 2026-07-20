from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from typing import Any

current_scraper = ContextVar("current_scraper", default="unknown_scraper")
logger = logging.getLogger(__name__)


def configure_logging(level: str) -> None:
    """Configure the process-wide JSON log threshold."""
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO), format="%(message)s"
    )


def log_event(action: str, level: str = "info", **details: Any) -> None:
    """Emit one structured log event with the current scraper context."""
    message = {
        "timestamp": logging.Formatter().formatTime(logging.makeLogRecord({})),
        "action": action,
        "level": level,
        "scraper": current_scraper.get(),
        **details,
    }
    serialized = json.dumps(message, ensure_ascii=False, default=str)
    getattr(logger, level, logger.info)(serialized)
