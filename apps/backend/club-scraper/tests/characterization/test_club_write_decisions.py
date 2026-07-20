import asyncio
from dataclasses import replace

import pytest

from models.club import Club
from scrapers import club_scraper
from scrapers.club_scraper import ClubScraper
from services import clubs_service


def _club(**overrides) -> Club:
    """Build a complete-enough owner mirror for decision tests."""
    values = {
        "id": "club-1",
        "rawName": "RAW CLUB",
        "name": "Club",
        "address": "1 Street",
        "city": "Paris",
        "postalCode": "75001",
        "email": "mail@example.invalid",
        "phoneNumber": "0102030405",
        "website": "https://club.example.invalid",
        "logoUrl": "logo.png",
        "active": True,
    }
    values.update(overrides)
    return Club(**values)


def test_creates_a_club_when_no_owner_resource_exists(monkeypatch) -> None:
    """Protect the create decision and returned owner response."""
    async def scenario() -> None:
        created = _club()
        calls: list[Club] = []

        async def create(_session, club: Club) -> Club:
            calls.append(club)
            return created

        monkeypatch.setattr(clubs_service, "create_club", create)
        monkeypatch.setattr(clubs_service, "log_event", lambda **_event: None)

        result = await clubs_service.add_or_update_club(None, _club(), None)

        assert result is created
        assert calls == [created]

    asyncio.run(scenario())


def test_skips_the_owner_write_when_the_club_is_unchanged(monkeypatch) -> None:
    """Protect the no-op behavior that makes repeated provider input idempotent."""
    async def scenario() -> None:
        existing = _club()

        async def unexpected(*_args, **_kwargs):
            raise AssertionError("No owner write is expected")

        monkeypatch.setattr(clubs_service, "create_club", unexpected)
        monkeypatch.setattr(clubs_service, "update_club", unexpected)

        result = await clubs_service.add_or_update_club(None, replace(existing), existing)

        assert result is existing

    asyncio.run(scenario())


def test_updates_changed_fields_and_reactivates_an_inactive_club(monkeypatch) -> None:
    """Protect update comparison, owner identity, logo preservation, and reactivation."""
    async def scenario() -> None:
        existing = _club(name="Old", logoUrl="owner-logo.png", active=False)
        candidate = _club(id="provider-id", name="New", logoUrl="provider-logo.png", active=False)
        calls: list[Club] = []

        async def update(_session, club: Club) -> Club:
            calls.append(club)
            return club

        monkeypatch.setattr(clubs_service, "update_club", update)
        monkeypatch.setattr(clubs_service, "log_event", lambda **_event: None)

        result = await clubs_service.add_or_update_club(None, candidate, existing)

        assert result.id == "club-1"
        assert result.name == "New"
        assert result.logoUrl == "owner-logo.png"
        assert result.active is True
        assert calls == [result]

    asyncio.run(scenario())


def test_rejects_a_club_without_owner_required_fields() -> None:
    """Protect validation before any Blockout write."""
    with pytest.raises(ValueError, match="rawName"):
        asyncio.run(clubs_service.add_or_update_club(None, _club(rawName=""), None))


def test_deactivates_only_cached_clubs_missing_after_a_successful_contact(monkeypatch) -> None:
    """Protect the safety gate that prevents mass deactivation during a provider outage."""
    async def scenario() -> None:
        scraper = ClubScraper(session=object())
        scraper._clubs_cache = {
            "club-1": (_club(id="club-1"), _club(id="club-1")),
            "club-2": (_club(id="club-2"), _club(id="club-2")),
        }
        deactivations: list[set[str]] = []

        async def scrape_one(_url: str, club_id: str) -> None:
            if club_id == "club-1":
                scraper.scrape_success += 1
                scraper.scraped_club_ids.add(club_id)

        async def deactivate(_session, missing_ids: set[str]) -> None:
            deactivations.append(missing_ids)

        monkeypatch.setattr(scraper, "scrape_one_club", scrape_one)
        monkeypatch.setattr(club_scraper, "bulk_deactivate_clubs", deactivate)
        monkeypatch.setattr(club_scraper, "log_event", lambda **_event: None)

        await scraper.run_scraping(["club-1", "club-2"])

        assert deactivations == [{"club-2"}]

    asyncio.run(scenario())


def test_skips_bulk_deactivation_when_no_provider_page_was_retrieved(monkeypatch) -> None:
    """Protect the outage safeguard when every FFVB fetch is empty or fails."""
    async def scenario() -> None:
        scraper = ClubScraper(session=object())
        scraper._clubs_cache = {"club-1": (_club(), _club())}
        events: list[dict] = []

        async def scrape_one(_url: str, _club_id: str) -> None:
            return None

        async def unexpected(*_args, **_kwargs) -> None:
            raise AssertionError("Bulk deactivation must be skipped")

        monkeypatch.setattr(scraper, "scrape_one_club", scrape_one)
        monkeypatch.setattr(club_scraper, "bulk_deactivate_clubs", unexpected)
        monkeypatch.setattr(club_scraper, "log_event", lambda **event: events.append(event))

        await scraper.run_scraping(["club-1"])

        assert events[-1]["action"] == "skip_bulk_deactivate_no_contact"

    asyncio.run(scenario())


def test_scrape_one_club_updates_only_the_current_provider_fields(monkeypatch) -> None:
    """Protect the legacy field merge before the write decision service is called."""
    async def scenario() -> None:
        scraper = ClubScraper(session=object())
        existing = _club(name="Old", logoUrl="keep-logo.png", latitude=48.0, longitude=2.0)
        updated = replace(existing)
        scraper._clubs_cache = {existing.id: (existing, updated)}
        provider = _club(name="New", city="Lyon", logoUrl="provider-logo.png", latitude=0.0, longitude=0.0)
        received: list[tuple[Club, Club | None]] = []

        async def fetch(_url, _form_data):
            return "provider html"

        async def write(_session, club: Club, current: Club | None) -> Club:
            received.append((club, current))
            return club

        monkeypatch.setattr(scraper, "fetch", fetch)
        monkeypatch.setattr(scraper, "parse_club_page", lambda _html, _id: provider)
        monkeypatch.setattr(club_scraper, "add_or_update_club", write)

        await scraper.scrape_one_club("https://provider.invalid", "club-1")

        candidate, current = received[0]
        assert current is existing
        assert candidate.name == "New"
        assert candidate.city == "Lyon"
        assert candidate.logoUrl == "keep-logo.png"
        assert candidate.latitude == 48.0
        assert candidate.longitude == 2.0
        assert scraper.scraped_club_ids == {"club-1"}
        assert scraper.scrape_success == 1

    asyncio.run(scenario())
