"""Import and serialization checks for generated Python contract clients."""

from blockout_contract_clients.club.api import ClubApi
from blockout_contract_clients.club.models import (
    ClubInternalResponse,
    CreateClubInternalRequest,
    UpdateClubInternalRequest,
)
from blockout_contract_clients.config.api import RawDivisionMappingApi, ScraperStatusApi
from blockout_contract_clients.config.models import (
    CreateRawDivisionMappingInternalRequest,
    RawDivisionMappingInternalResponse,
)
from blockout_contract_clients.shared.models import (
    FormatEnum,
    GenderEnum,
    ScraperNameEnum,
)
from blockout_contract_clients.pool.api import PoolApi
from blockout_contract_clients.pool.models import (
    CreatePoolInternalRequest,
    FormatEnum as PoolFormatEnum,
    GenderEnum as PoolGenderEnum,
    PoolInternalResponse,
)
from blockout_contract_clients.team.api import TeamApi
from blockout_contract_clients.team.models import (
    CreateTeamInternalRequest,
    FormatEnum as TeamFormatEnum,
    GenderEnum as TeamGenderEnum,
    TeamInternalResponse,
)


def test_shared_transport_enums_are_generated() -> None:
    """Expose shared transport enum values from the private wheel."""
    assert FormatEnum.SIX.value == "SIX"
    assert GenderEnum.F.value == "F"
    assert ScraperNameEnum.SCRAPER_CLUBS.value == "SCRAPER_CLUBS"


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


def test_config_models_and_async_apis_are_generated() -> None:
    """Expose generated Config requests, responses, and asynchronous APIs."""
    request = CreateRawDivisionMappingInternalRequest(
        raw_division_name="N3",
        league_code="LNV",
        season="2026/2027",
    )
    response = RawDivisionMappingInternalResponse.from_dict(
        {
            "id": 1,
            "rawDivisionName": "N3",
            "leagueCode": "LNV",
            "season": "2026/2027",
            "mapped": False,
        }
    )

    assert request.to_dict()["rawDivisionName"] == "N3"
    assert response is not None
    assert response.raw_division_name == "N3"
    assert RawDivisionMappingApi.list_raw_division_mappings.__name__ == (
        "list_raw_division_mappings"
    )
    assert ScraperStatusApi.get_scraper_status.__name__ == "get_scraper_status"


def test_team_models_and_async_api_are_generated() -> None:
    """Expose the complete Team boundary and its asynchronous API."""
    request = CreateTeamInternalRequest(
        club_id="club-1",
        raw_name="RAW",
        name="Team",
        short_name="T",
        league_code="LNV",
        division_id=2,
        season="2026/2027",
        format=TeamFormatEnum.SIX,
        gender=TeamGenderEnum.F,
    )
    response = TeamInternalResponse.from_dict(
        {
            **request.to_dict(),
            "id": 1,
            "followersCount": 0,
            "active": True,
        }
    )

    assert request.to_dict()["clubId"] == "club-1"
    assert response is not None
    assert response.raw_name == "RAW"
    assert TeamApi.list_teams.__name__ == "list_teams"


def test_pool_models_and_async_api_are_generated() -> None:
    """Expose the complete Pool boundary and its asynchronous API."""
    request = CreatePoolInternalRequest(
        pool_code="A",
        league_code="LNV",
        season="2026/2027",
        league_name="League",
        raw_name="RAW",
        name="Pool",
        short_name="P",
        division_id=2,
        format=PoolFormatEnum.SIX,
        gender=PoolGenderEnum.F,
    )
    response = PoolInternalResponse.from_dict(
        {**request.to_dict(), "id": 1, "followersCount": 0, "active": True}
    )

    assert request.to_dict()["divisionId"] == 2
    assert response is not None
    assert response.pool_code == "A"
    assert PoolApi.list_pools.__name__ == "list_pools"
