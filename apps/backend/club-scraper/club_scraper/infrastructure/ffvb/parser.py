from __future__ import annotations

import re

from bs4 import BeautifulSoup

from club_scraper.infrastructure.ffvb.models import FfvbClubRecord
from club_scraper.observability.logging import log_event


def parse_club_page(html_content: str, identifier: str) -> FfvbClubRecord | None:
    """Parse one FFVB address-book page using the characterized legacy rules."""
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        raw_name = _club_name(soup)
        postal_code, city = _postal_code_and_city(soup)
        return FfvbClubRecord(
            identifier=identifier,
            raw_name=raw_name,
            name=raw_name,
            address=_address(soup),
            city=capitalize_words(city),
            postal_code=postal_code,
            email=_email(soup),
            phone_number=_phone_number(soup),
            website=_website(soup),
        )
    except Exception as error:
        log_event(
            action="club_scraper_parse_error",
            level="error",
            clubId=identifier,
            error=str(error),
            message=f"Erreur lors du parsing HTML du club {identifier}.",
        )
        return None


def capitalize_words(text: str | None) -> str:
    """Capitalize words while preserving spaces and hyphens."""
    if not text:
        return ""
    parts = re.split(r"([- ])", text.strip())
    return "".join(
        part.capitalize() if part not in {" ", "-"} else part for part in parts
    )


def _club_name(soup: BeautifulSoup) -> str | None:
    name = soup.find("td", class_="titreblanc_gd")
    return name.get_text(strip=True).split(maxsplit=1)[-1] if name else None


def _phone_number(soup: BeautifulSoup) -> str | None:
    label = soup.find(string=re.compile(r"(Portable|T[ée]l\.?)", re.IGNORECASE))
    parent = label.find_parent("td") if label else None
    value = parent.find_next("td") if parent else None
    return value.get_text(strip=True) if value else None


def _email(soup: BeautifulSoup) -> str | None:
    link = soup.find("a", href=lambda href: href and href.startswith("mailto:"))
    return link.get_text(strip=True) if link else None


def _website(soup: BeautifulSoup) -> str | None:
    image = soup.find("img", {"title": "Site Web"})
    parent = image.find_parent("td") if image else None
    value = parent.find_next("td") if parent else None
    link = value.find("a", href=True) if value else None
    return link.get_text(strip=True).rstrip("/") if link else None


def _postal_code_and_city(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    direct = soup.find(
        "td",
        class_="lienquestion",
        string=re.compile(r"^\d{5}\s+[A-Za-zÀ-ÖØ-öø-ÿ].*", re.IGNORECASE),
    )
    if direct:
        parts = direct.get_text(strip=True).split(maxsplit=1)
        return (parts[0], parts[1]) if len(parts) == 2 else (None, None)

    fallback = re.compile(
        r"(?P<cp>\d{5})(?:\s+\d{5})?\s*-\s*(?P<ville>.+)", re.IGNORECASE
    )
    for cell in soup.find_all("td", class_="lienquestion"):
        match = fallback.match(cell.get_text(strip=True))
        if match:
            return match.group("cp"), match.group("ville").strip()
    return None, None


def _address(soup: BeautifulSoup) -> str | None:
    header = soup.find("td", string=re.compile("Siège Social", re.IGNORECASE))
    table = header.find_parent("table") if header else None
    if not table:
        return None

    lines: list[str] = []
    for cell in table.find_all("td", class_="lienquestion"):
        text = cell.get_text(strip=True)
        if re.match(r"^\d{5}\s+", text):
            break
        lines.append(text)

    if not lines:
        return None
    parts = [part.strip() for part in ", ".join(lines).split(",") if part.strip()]
    return ", ".join(parts[-2:] if len(parts) >= 3 else parts)
