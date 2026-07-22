"""Structured JSON logging boundary for the competition scraper."""

import json
import logging
from contextvars import ContextVar
from typing import Any

logger = logging.getLogger(__name__)

current_scraper = ContextVar("current_scraper", default="unknown_scraper")


def configure_logging(level: str) -> None:
    """Configure the process-wide JSON log threshold."""
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO), format="%(message)s"
    )


def log_event(action: str, level: str = "info", **kwargs: Any) -> None:
    """Write one JSON event enriched with the current scraper name."""
    scraper_name = current_scraper.get()

    log_message = {
        "timestamp": logging.Formatter().formatTime(logging.makeLogRecord({})),
        "action": action,
        "level": level,
        "scraper": scraper_name,
        **kwargs,
    }

    log_message_json = json.dumps(log_message, ensure_ascii=False)

    getattr(logger, level, logger.info)(log_message_json)
