import asyncio
import json
import logging
from dataclasses import replace
from pathlib import Path

import pytest
from scraper.application.club_ingestion import ClubIngestion
from scraper.application.club_writer import ClubWriter
from scraper.domain.models import Club

FIXTURES = Path(__file__).parents[1] / "fixtures" / "ffvb"


def _club(**overrides) -> Club:
    """Build a complete-enough owner response for decision tests."""
    values = {
        "id": "club-1",
        "raw_name": "RAW CLUB",
        "name": "Club",
        "address": "1 Street",
        "city": "Paris",
        "postal_code": "75001",
        "email": "mail@example.invalid",
        "phone_number": "0102030405",
        "website": "https://club.example.invalid",
        "logo_url": "logo.png",
        "active": True,
    }
    values.update(overrides)
    return Club(**values)


class RecordingBlockout:
    """Record owner reads and writes without external calls."""

    def __init__(self, clubs=None, identifiers=None) -> None:
        self.clubs = [] if clubs is None else clubs
        self.identifiers = [] if identifiers is None else identifiers
        self.creates: list[Club] = []
        self.updates: list[Club] = []
        self.deactivations: list[set[str]] = []

    async def get_all_clubs(self):
        return self.clubs

    async def get_unique_club_ids(self):
        return self.identifiers

    async def create_club(self, club):
        self.creates.append(replace(club))
        return club

    async def update_club(self, club):
        self.updates.append(replace(club))
        return club

    async def bulk_deactivate_clubs(self, identifiers):
        self.deactivations.append(set(identifiers))


class ScriptedFfvb:
    """Return sanitized HTML by club identifier."""

    def __init__(self, pages) -> None:
        self.pages = pages

    async def fetch_club_page(self, identifier):
        return self.pages[identifier]


class Gauge:
    def __init__(self) -> None:
        self.values: list[float] = []

    def set(self, value: float) -> None:
        self.values.append(value)


def _fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_creates_a_club_when_no_owner_resource_exists() -> None:
    """Protect the create decision and exact typed request."""

    async def scenario() -> None:
        blockout = RecordingBlockout()
        candidate = _club()

        result = await ClubWriter(blockout).save(candidate, None)

        assert result.id == "club-1"
        assert blockout.creates == [candidate]

    asyncio.run(scenario())


def test_skips_the_owner_write_when_the_club_is_unchanged() -> None:
    """Protect the no-op behavior for repeated provider input."""

    async def scenario() -> None:
        blockout = RecordingBlockout()
        existing = _club()

        result = await ClubWriter(blockout).save(replace(existing), existing)

        assert result is existing
        assert blockout.creates == []
        assert blockout.updates == []

    asyncio.run(scenario())


def test_updates_changed_fields_and_reactivates_an_inactive_club() -> None:
    """Protect identity, logo ownership, field comparison, and reactivation."""

    async def scenario() -> None:
        blockout = RecordingBlockout()
        existing = _club(name="Old", logo_url="owner-logo.png", active=False)
        candidate = _club(
            id="provider-id", name="New", logo_url="provider-logo.png", active=False
        )

        await ClubWriter(blockout).save(candidate, existing)

        updated = blockout.updates[0]
        assert updated.id == "club-1"
        assert updated.name == "New"
        assert updated.logo_url == "owner-logo.png"
        assert candidate.active is True

    asyncio.run(scenario())


def test_rejects_a_club_without_owner_required_fields() -> None:
    """Protect validation before any Blockout write."""
    with pytest.raises(ValueError, match="raw_name"):
        asyncio.run(ClubWriter(RecordingBlockout()).save(_club(raw_name=""), None))


def test_deactivates_only_missing_clubs_after_a_successful_contact() -> None:
    """Protect deactivation after at least one non-empty provider response."""

    async def scenario() -> None:
        clubs = [_club(id="club-1"), _club(id="club-2")]
        blockout = RecordingBlockout(clubs, ["club-1", "club-2"])
        ffvb = ScriptedFfvb(
            {
                "club-1": _fixture("portable_two_lines_with_website.html"),
                "club-2": "",
            }
        )

        await ClubIngestion(blockout, ffvb, Gauge()).run()

        assert blockout.deactivations == [{"club-2"}]

    asyncio.run(scenario())


def test_skips_deactivation_when_no_provider_page_was_retrieved() -> None:
    """Protect the mass-deactivation outage safeguard."""

    async def scenario() -> None:
        blockout = RecordingBlockout([_club()], ["club-1"])

        await ClubIngestion(blockout, ScriptedFfvb({"club-1": ""}), Gauge()).run()

        assert blockout.deactivations == []

    asyncio.run(scenario())


def test_owner_preload_failure_aborts_before_provider_or_owner_writes(caplog) -> None:
    """Fail the ingestion attempt closed when owner state cannot be loaded."""

    async def scenario() -> None:
        class FailingBlockout(RecordingBlockout):
            def __init__(self) -> None:
                super().__init__(identifiers=["club-1"])
                self.identifier_reads = 0

            async def get_all_clubs(self):
                raise RuntimeError("credential-bearing owner response")

            async def get_unique_club_ids(self):
                self.identifier_reads += 1
                return self.identifiers

        class RecordingFfvb:
            def __init__(self) -> None:
                self.fetches: list[str] = []

            async def fetch_club_page(self, identifier):
                self.fetches.append(identifier)
                return _fixture("portable_two_lines_with_website.html")

        blockout = FailingBlockout()
        ffvb = RecordingFfvb()

        with pytest.raises(RuntimeError, match="credential-bearing owner response"):
            await ClubIngestion(blockout, ffvb, Gauge()).run()

        events = [
            json.loads(record.message)
            for record in caplog.records
            if record.name == "scraper.observability.logging"
        ]
        assert len(events) == 1
        event = events[0]
        assert event["action"] == "owner_clubs_preload_failed"
        assert event["level"] == "error"
        assert event["scraper"] == "club_scraper"
        assert event["dependency"] == "clubs_service"
        assert event["operation"] == "get_all_clubs"
        assert event["error_type"] == "RuntimeError"
        assert event["message"] == (
            "Club owner-state preload failed; ingestion attempt aborted."
        )
        assert "credential-bearing owner response" not in caplog.text
        assert blockout.identifier_reads == 0
        assert ffvb.fetches == []
        assert blockout.creates == []
        assert blockout.updates == []
        assert blockout.deactivations == []

    with caplog.at_level(logging.ERROR, logger="scraper.observability.logging"):
        asyncio.run(scenario())


def test_provider_merge_preserves_owner_only_fields() -> None:
    """Protect logo and coordinate ownership during the FFVB merge."""

    async def scenario() -> None:
        existing = _club(
            name="Old",
            logo_url="owner-logo.png",
            latitude=48.0,
            longitude=2.0,
        )
        blockout = RecordingBlockout([existing], ["club-1"])
        ffvb = ScriptedFfvb(
            {"club-1": _fixture("portable_two_lines_with_website.html")}
        )

        await ClubIngestion(blockout, ffvb, Gauge()).run()

        updated = blockout.updates[0]
        assert updated.id == "club-1"
        assert updated.name == "L'ENVOLLEY 01"
        assert updated.city == "St Etienne Du Bois"
        assert updated.logo_url == "owner-logo.png"
        assert existing.latitude == 48.0
        assert existing.longitude == 2.0

    asyncio.run(scenario())
