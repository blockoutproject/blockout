from contextvars import ContextVar

# Variable de contexte pour suivre le scraper actif
current_scraper = ContextVar("current_scraper", default="unknown_scraper")