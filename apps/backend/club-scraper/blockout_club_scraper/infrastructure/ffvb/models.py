from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FfvbClubRecord:
    """Club fields observed in the FFVB address book."""

    identifier: str
    raw_name: str | None
    name: str | None
    address: str | None = None
    city: str = ""
    postal_code: str | None = None
    email: str | None = None
    phone_number: str | None = None
    website: str | None = None
