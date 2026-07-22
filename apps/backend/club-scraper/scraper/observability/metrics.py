"""Expose the club scraper Prometheus measurements."""

from prometheus_client import Gauge

execution_duration = Gauge(
    "scraper_clubs_execution_duration_seconds",
    "Duration of the scraper clubs execution in seconds",
)

club_scraping_duration = Gauge(
    "clubscraper_scraping_duration_seconds",
    "Durée du scraping pour le scraper clubscraper",
)
