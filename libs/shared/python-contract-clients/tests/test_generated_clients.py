"""Import and serialization checks for generated Python contract clients."""

from blockout_contract_clients.club.api import ClubApi
from blockout_contract_clients.club.models import (
    ClubInternalResponse,
    CreateClubInternalRequest,
    UpdateClubInternalRequest,
)
from blockout_contract_clients.shared.models import FormatEnum, GenderEnum


def test_shared_transport_enums_are_generated() -> None:
    """Expose shared transport enum values from the private wheel."""
    assert FormatEnum.SIX.value == "SIX"
    assert GenderEnum.F.value == "F"


def test_club_models_preserve_camel_case_json() -> None:
    """Serialize the complete Club boundary with its existing wire names."""
    club = ClubInternalResponse(
        id="club-1",
        raw_name="BLOCKOUT",
        name="Blockout",
        active=True,
        postal_code="75001",
    )

    assert club.to_dict() == {
        "id": "club-1",
        "rawName": "BLOCKOUT",
        "name": "Blockout",
        "postalCode": "75001",
        "active": True,
    }


def test_club_requests_and_async_api_are_generated() -> None:
    """Expose generated create/update models and the asynchronous Club API."""
    create = CreateClubInternalRequest(id="club-1", raw_name="RAW", name="Club")
    update = UpdateClubInternalRequest(name="Updated")

    assert create.to_dict()["rawName"] == "RAW"
    assert update.to_dict() == {"name": "Updated"}
    assert ClubApi.create_club.__name__ == "create_club"
