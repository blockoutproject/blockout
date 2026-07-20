from pathlib import Path

import pytest
from club_scraper.infrastructure.ffvb.parser import parse_club_page

FIXTURES = Path(__file__).parents[1] / "fixtures" / "ffvb"

REAL_FFVB_CASES = (
    pytest.param(
        "dual_phone_four_lines_no_website.html",
        "ASS SPORTIVE DE LAGNIEU",
        "ADDRESS LINE 2, ADDRESS LINE 3",
        "Lagnieu",
        "01150",
        "01 02 03 04 05",
        None,
        id="dual-phone-four-lines-no-website",
    ),
    pytest.param(
        "dual_phone_four_lines_with_website.html",
        "SAINT-MAURICE COTIERE VOLLEY",
        "ADDRESS LINE 2, ADDRESS LINE 3",
        "Miribel",
        "01700",
        "01 02 03 04 05",
        "https://club.example.invalid",
        id="dual-phone-four-lines-with-website",
    ),
    pytest.param(
        "dual_phone_three_lines_no_website.html",
        "SWE RAIZET VOLLEYBALL",
        "ADDRESS LINE 1, ADDRESS LINE 2",
        "Abymes",
        "97139",
        "01 02 03 04 05",
        None,
        id="dual-phone-three-lines-no-website",
    ),
    pytest.param(
        "dual_phone_three_lines_with_website.html",
        "VOLLEY CLUB MEXIMIEUX",
        "ADDRESS LINE 1, ADDRESS LINE 2",
        "Meximieux",
        "01800",
        "01 02 03 04 05",
        "https://club.example.invalid",
        id="dual-phone-three-lines-with-website",
    ),
    pytest.param(
        "dual_phone_two_lines_no_website.html",
        "GROUPEMENT SPORTIF DEPARTEMENTAL NORD DE VB",
        "ADDRESS LINE 1",
        "Marcq En Baroeul - Marcq En Ba",
        "59700",
        "01 02 03 04 05",
        None,
        id="dual-phone-two-lines-no-website",
    ),
    pytest.param(
        "dual_phone_two_lines_with_website.html",
        "DUNKERQUE GRAND LITTORAL V.B.",
        "ADDRESS LINE 1",
        "Dunkerque",
        "59140",
        "01 02 03 04 05",
        "https://club.example.invalid",
        id="dual-phone-two-lines-with-website",
    ),
    pytest.param(
        "landline_two_lines_no_website.html",
        "PHARE ATHLETIQUE CLUB",
        "ADDRESS LINE 1",
        "Sainte-Suzanne",
        "97441",
        "01 02 03 04 05",
        None,
        id="landline-two-lines-no-website",
    ),
    pytest.param(
        "landline_two_lines_with_website.html",
        "BORDEAUX BEACH CHILLERS",
        "ADDRESS LINE 1",
        "Mérignac",
        "33700",
        "01 02 03 04 05",
        "https://club.example.invalid",
        id="landline-two-lines-with-website",
    ),
    pytest.param(
        "malformed_postal_two_codes.html",
        "U.S. DES AIGLES BLANCS DE ST PAUL VB",
        "ADDRESS LINE 1, ADDRESS LINE 2",
        "",
        None,
        "06 01 02 03 04",
        "https://club.example.invalid",
        id="malformed-postal-two-codes",
    ),
    pytest.param(
        "portable_four_lines_with_website.html",
        "AMBERIEU VOLLEY BALL",
        "ADDRESS LINE 2, ADDRESS LINE 3",
        "Amberieu En Bugey",
        "01500",
        "06 01 02 03 04",
        "https://club.example.invalid",
        id="portable-four-lines-with-website",
    ),
    pytest.param(
        "portable_three_lines_no_website.html",
        "ASSOCIATION SPORTIVE ARBENT VOLLEY-BALL",
        "ADDRESS LINE 1, ADDRESS LINE 2",
        "Arbent",
        "01100",
        "06 01 02 03 04",
        None,
        id="portable-three-lines-no-website",
    ),
    pytest.param(
        "portable_three_lines_with_website.html",
        "CLUB VOLLEY-BALL DES CATALANS",
        "ADDRESS LINE 1, ADDRESS LINE 2",
        "Marseille",
        "13007",
        "06 01 02 03 04",
        "https://club.example.invalid",
        id="portable-three-lines-with-website",
    ),
    pytest.param(
        "portable_two_lines_no_website.html",
        "VOLLEY'N CO CHATILLON",
        "ADDRESS LINE 1",
        "Chatillon Sur Chalaronne",
        "01400",
        "06 01 02 03 04",
        None,
        id="portable-two-lines-no-website",
    ),
    pytest.param(
        "portable_two_lines_with_website.html",
        "L'ENVOLLEY 01",
        "ADDRESS LINE 1",
        "St Etienne Du Bois",
        "01370",
        "06 01 02 03 04",
        "https://club.example.invalid",
        id="portable-two-lines-with-website",
    ),
)


def _fixture(name: str) -> str:
    """Load a sanitized page derived from a real FFVB response."""
    return (FIXTURES / name).read_text(encoding="utf-8")


@pytest.mark.parametrize(
    (
        "fixture_name",
        "expected_name",
        "expected_address",
        "expected_city",
        "expected_postal_code",
        "expected_phone_number",
        "expected_website",
    ),
    REAL_FFVB_CASES,
)
def test_parses_each_source_derived_ffvb_layout(
    fixture_name: str,
    expected_name: str,
    expected_address: str,
    expected_city: str,
    expected_postal_code: str | None,
    expected_phone_number: str,
    expected_website: str | None,
) -> None:
    """Protect every parser-relevant layout found in the 50-club live sample."""
    club = parse_club_page(_fixture(fixture_name), fixture_name)

    assert club is not None
    assert club.identifier == fixture_name
    assert club.raw_name == expected_name
    assert club.name == expected_name
    assert club.address == expected_address
    assert club.city == expected_city
    assert club.postal_code == expected_postal_code
    assert club.email == "contact@example.invalid"
    assert club.phone_number == expected_phone_number
    assert club.website == expected_website


def test_source_derived_ffvb_pages_are_complete_and_sanitized() -> None:
    """Keep real DOM coverage without committing the captured personal contacts."""
    for fixture in sorted(FIXTURES.glob("*.html")):
        html = fixture.read_text(encoding="utf-8")

        assert "Source-derived FFVB fixture captured 2026-07-20" in html
        assert "Fiche du Club" in html
        assert "Coordonnées" in html
        assert "Siège Social" in html
        assert "Sportive" in html
        assert "Ligue Régionale" in html
        assert "@" not in html.replace("contact@example.invalid", "")


def test_returns_none_when_beautiful_soup_cannot_parse(monkeypatch) -> None:
    """Record the current parser failure boundary and its swallowed exception."""
    from club_scraper.infrastructure.ffvb import parser

    events: list[dict] = []
    monkeypatch.setattr(
        parser,
        "BeautifulSoup",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(ValueError("bad html")),
    )
    monkeypatch.setattr(parser, "log_event", lambda **event: events.append(event))

    result = parse_club_page(_fixture("portable_two_lines_with_website.html"), "club-4")

    assert result is None
    assert events[-1]["action"] == "club_scraper_parse_error"
    assert events[-1]["clubId"] == "club-4"
