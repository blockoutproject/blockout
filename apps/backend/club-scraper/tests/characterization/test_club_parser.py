from pathlib import Path

from scrapers.club_scraper import ClubScraper


FIXTURES = Path(__file__).parents[1] / "fixtures" / "ffvb"


def _fixture(name: str) -> str:
    """Load a sanitized FFVB address-book fragment."""
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parses_the_complete_ffvb_club_shape() -> None:
    """Protect the current FFVB labels, address trimming, and normalization rules."""
    club = ClubScraper(session=None).parse_club_page(_fixture("club_complete.html"), "club-1")

    assert club is not None
    assert club.id == "club-1"
    assert club.rawName == "BLOCKOUT PARIS"
    assert club.name == "BLOCKOUT PARIS"
    assert club.phoneNumber == "06 01 02 03 04"
    assert club.email == "contact@example.invalid"
    assert club.website == "https://club.example.invalid"
    assert club.postalCode == "75001"
    assert club.city == "Paris"
    assert club.address == "12 Rue du Volley, Bâtiment B"


def test_parses_the_duplicated_postal_code_fallback() -> None:
    """Protect the legacy FFVB fallback used for duplicated postal codes."""
    club = ClubScraper(session=None).parse_club_page(_fixture("club_fallback_address.html"), "club-2")

    assert club is not None
    assert club.rawName == "VOLLEY TEST"
    assert club.postalCode == "69001"
    assert club.city == "Lyon Cedex"
    assert club.address == "8 Avenue du Test"


def test_returns_a_partial_club_when_provider_fields_are_missing() -> None:
    """Record that parsing missing markup returns a partial object rather than rejecting it."""
    club = ClubScraper(session=None).parse_club_page(_fixture("club_missing_fields.html"), "club-3")

    assert club is not None
    assert club.id == "club-3"
    assert club.rawName is None
    assert club.name is None
    assert club.city == ""
    assert club.postalCode is None


def test_returns_none_when_beautiful_soup_cannot_parse(monkeypatch) -> None:
    """Record the current parser failure boundary and its swallowed exception."""
    from scrapers import club_scraper

    events: list[dict] = []
    monkeypatch.setattr(club_scraper, "BeautifulSoup", lambda *_args, **_kwargs: (_ for _ in ()).throw(ValueError("bad html")))
    monkeypatch.setattr(club_scraper, "log_event", lambda **event: events.append(event))

    result = ClubScraper(session=None).parse_club_page("<html>", "club-4")

    assert result is None
    assert events[-1]["action"] == "club_scraper_parse_error"
    assert events[-1]["clubId"] == "club-4"
