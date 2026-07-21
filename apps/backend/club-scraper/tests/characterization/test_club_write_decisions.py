import asyncio
import pytest
from dataclasses import replace
from pathlib import Path
from scraper.application.club_ingestion import ClubIngestion
from scraper.application.club_writer import ClubWriter
from scraper.infrastructure.blockout.contracts import (
    ClubInternalResponse,
)

FIXTURES = Path(__file__).parents[1] / "fixtures" / "ffvb"


def _club(**overrides) -> ClubInternalResponse:
    """Build a complete-enough owner response for decision tests."""
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
    return ClubInternalResponse(**values)


class RecordingBlockout:
    """Record owner reads and writes without external calls."""

    def __init__(self, clubs=None, identifiers=None) -> None:
        self.clubs = [] if clubs is None else clubs
        self.identifiers = [] if identifiers is None else identifiers
        self.creates: list[ClubInternalResponse] = []
        self.updates: list[ClubInternalResponse] = []
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
        existing = _club(name="Old", logoUrl="owner-logo.png", active=False)
        candidate = _club(
            id="provider-id", name="New", logoUrl="provider-logo.png", active=False
        )

        await ClubWriter(blockout).save(candidate, existing)

        updated = blockout.updates[0]
        assert updated.id == "club-1"
        assert updated.name == "New"
        assert updated.logoUrl == "owner-logo.png"
        assert candidate.active is True

    asyncio.run(scenario())


def test_rejects_a_club_without_owner_required_fields() -> None:
    """Protect validation before any Blockout write."""
    with pytest.raises(ValueError, match="rawName"):
        asyncio.run(ClubWriter(RecordingBlockout()).save(_club(rawName=""), None))


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


def test_provider_merge_preserves_owner_only_fields() -> None:
    """Protect logo and coordinate ownership during the FFVB merge."""

    async def scenario() -> None:
        existing = _club(
            name="Old",
            logoUrl="owner-logo.png",
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
        assert updated.logoUrl == "owner-logo.png"
        assert existing.latitude == 48.0
        assert existing.longitude == 2.0

    asyncio.run(scenario())
