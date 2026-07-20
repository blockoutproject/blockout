import json
import logging
from contextvars import ContextVar

from scraper.config.settings import LOG_LEVEL

log_level = getattr(logging, LOG_LEVEL, logging.INFO)

logging.basicConfig(level=log_level, format="%(message)s")

logger = logging.getLogger(__name__)

current_scraper = ContextVar("current_scraper", default="unknown_scraper")


def log_event(action: str, level: str = "info", **kwargs) -> None:
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

    if level == "info":
        logger.info(log_message_json)
    elif level == "warning":
        logger.warning(log_message_json)
    elif level == "error":
        logger.error(log_message_json)
    elif level == "debug":
        logger.debug(log_message_json)
