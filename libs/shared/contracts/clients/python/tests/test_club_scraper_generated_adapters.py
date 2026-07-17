from __future__ import annotations

import importlib
from pathlib import Path
import sys
import types
import unittest
from unittest import mock


WORKSPACE_ROOT = Path(__file__).resolve().parents[6]
CLIENT_ROOT = WORKSPACE_ROOT / "libs/shared/contracts/clients/python"
CLUB_SCRAPER_ROOT = WORKSPACE_ROOT / "apps/scrapers/club-scraper"
sys.path.insert(0, str(CLIENT_ROOT / "src"))
sys.path.insert(0, str(CLUB_SCRAPER_ROOT))
for adapter_module in ("api.clubs_api", "api.competitions_api", "api.teams_api"):
    importlib.import_module(adapter_module)


class FakeBlockoutClient:
    def __init__(self, responses: dict[str, list[object]]):
        self.api_client = object()
        self.responses = responses
        self.calls: list[tuple[str, dict[str, object]]] = []

    async def invoke(self, operation, *args, **kwargs):
        name = operation.__name__
        self.calls.append((name, kwargs))
        return self.responses[name].pop(0)


def club_response(identifier: str, *, active: bool = True):
    from blockout_contract_clients.clubs_service.models.club_internal_response import ClubInternalResponse

    return ClubInternalResponse(
        id=identifier,
        raw_name=f"Raw {identifier}",
        name=f"Club {identifier}",
        address="1 Beach Street",
        city="Paris",
        postal_code="75000",
        email="club@example.com",
        phone_number="0102030405",
        website="https://club.example.com",
        logo_url="https://cdn.example.com/logo.png",
        active=active,
        latitude=None,
        longitude=None,
    )


class ClubScraperGeneratedAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_run_bundle_owns_three_generated_client_lifecycles(self) -> None:
        from api import blockout_client

        fake_env = types.ModuleType("config.env_config")
        fake_env.CLUB_API_URL = "https://clubs.invalid"
        fake_env.TEAM_API_URL = "https://teams.invalid"
        fake_env.COMPETITION_API_URL = "https://competition.invalid"
        contexts = []

        class ClientContext:
            def __init__(self, host):
                self.host = host
                self.closed = False
                contexts.append(self)

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, traceback):
                self.closed = True

        def create_client(configuration_type, api_client_type, host, token_supplier):
            return ClientContext(host)

        with mock.patch.dict(sys.modules, {"config.env_config": fake_env}):
            with mock.patch.object(blockout_client, "create_run_client", side_effect=create_client):
                async with blockout_client.create_run_clients(lambda: "token") as clients:
                    self.assertEqual("https://clubs.invalid", clients.clubs.host)
                    self.assertEqual("https://teams.invalid", clients.teams.host)
                    self.assertEqual("https://competition.invalid", clients.competition.host)
                    self.assertFalse(any(context.closed for context in contexts))

        self.assertEqual(3, len(contexts))
        self.assertTrue(all(context.closed for context in contexts))

    async def test_club_list_aggregates_pages_and_maps_application_models(self) -> None:
        from api.clubs_api import get_all_clubs
        from blockout_contract_clients.clubs_service.models.club_internal_page_response import (
            ClubInternalPageResponse,
        )
        from blockout_contract_clients.clubs_service.models.page_info import PageInfo
        from models.club import Club

        client = FakeBlockoutClient(
            {
                "list_clubs": [
                    ClubInternalPageResponse(
                        items=[club_response("club-1")],
                        page_info=PageInfo(page=0, page_size=100, total_items=2, has_next=True),
                    ),
                    ClubInternalPageResponse(
                        items=[club_response("club-2", active=False)],
                        page_info=PageInfo(page=1, page_size=100, total_items=2, has_next=False),
                    ),
                ]
            }
        )

        clubs = await get_all_clubs(client)

        self.assertEqual(["club-1", "club-2"], [club.id for club in clubs])
        self.assertTrue(all(type(club) is Club for club in clubs))
        self.assertFalse(clubs[1].active)
        self.assertEqual(
            [("list_clubs", {"page": 0, "page_size": 100}), ("list_clubs", {"page": 1, "page_size": 100})],
            client.calls,
        )

    async def test_club_create_and_update_use_generated_multipart_models(self) -> None:
        from api.clubs_api import create_club, update_club
        from models.club import Club

        application_club = Club(
            id="club-1",
            raw_name="Raw Club",
            name="Club",
            address="1 Beach Street",
            city="Paris",
            postal_code="75000",
            email="club@example.com",
            phone_number="0102030405",
            website="https://club.example.com",
        )
        client = FakeBlockoutClient(
            {
                "create_club": [club_response("club-1")],
                "update_club": [club_response("club-1")],
            }
        )

        created = await create_club(client, application_club, "/tmp/logo.png")
        updated = await update_club(client, application_club)

        self.assertIs(type(created), Club)
        self.assertIs(type(updated), Club)
        create_call = client.calls[0][1]
        self.assertEqual("/tmp/logo.png", create_call["image"])
        self.assertEqual("Raw Club", create_call["data"].to_dict()["rawName"])
        self.assertNotIn("raw_name", create_call["data"].to_dict())
        update_call = client.calls[1][1]
        self.assertEqual("club-1", update_call["id"])
        self.assertEqual("1 Beach Street", update_call["data"].to_dict()["address"])
        self.assertFalse(update_call["data"].to_dict()["removeLogo"])

    async def test_team_ids_aggregate_and_competition_command_is_canonical(self) -> None:
        from api.competitions_api import bulk_deactivate_clubs
        from api.teams_api import get_unique_club_ids
        from blockout_contract_clients.teams_service.models.page_info import PageInfo
        from blockout_contract_clients.teams_service.models.team_club_id_page_response import TeamClubIdPageResponse

        team_client = FakeBlockoutClient(
            {
                "list_team_club_ids": [
                    TeamClubIdPageResponse(
                        items=["club-2"],
                        page_info=PageInfo(page=0, page_size=100, total_items=2, has_next=True),
                    ),
                    TeamClubIdPageResponse(
                        items=["club-1"],
                        page_info=PageInfo(page=1, page_size=100, total_items=2, has_next=False),
                    ),
                ]
            }
        )
        competition_client = FakeBlockoutClient({"bulk_deactivate_competition_clubs": [None]})

        club_ids = await get_unique_club_ids(team_client)
        await bulk_deactivate_clubs(competition_client, {"club-2", "club-1"})

        self.assertEqual(["club-2", "club-1"], club_ids)
        command = competition_client.calls[0][1]["missing_club_ids_internal_request"]
        self.assertEqual(["club-1", "club-2"], command.missing_club_ids)
        self.assertEqual(["club-1", "club-2"], command.to_dict()["missingClubIds"])

    async def test_status_adapter_maps_generated_enum_without_leaking_generated_type(self) -> None:
        from blockout_contract_clients.config_service.models.scraper_name_enum import ScraperNameEnum
        from blockout_contract_clients.config_service.models.scraper_status_internal_response import (
            ScraperStatusInternalResponse,
        )

        fake_auth = types.ModuleType("api.auth0")
        fake_auth.get_token = lambda: "token"
        fake_env = types.ModuleType("config.env_config")
        fake_env.CONFIG_API_URL = "https://config.invalid"

        with mock.patch.dict(
            sys.modules,
            {"api.auth0": fake_auth, "config.env_config": fake_env},
        ):
            sys.modules.pop("api.config_api", None)
            config_api = importlib.import_module("api.config_api")

        client = FakeBlockoutClient(
            {
                "get_scraper_status": [
                    ScraperStatusInternalResponse(name=ScraperNameEnum.SCRAPER_CLUBS, enabled=True)
                ]
            }
        )

        class ClientContext:
            async def __aenter__(self):
                return client

            async def __aexit__(self, exc_type, exc, traceback):
                return None

        with mock.patch.object(config_api, "create_status_client", return_value=ClientContext()):
            status = await config_api.get_scraper_status("SCRAPER_CLUBS")

        self.assertEqual("SCRAPER_CLUBS", status.name)
        self.assertTrue(status.enabled)
        self.assertEqual(ScraperNameEnum.SCRAPER_CLUBS, client.calls[0][1]["name"])
        self.assertEqual("ScraperStatus", type(status).__name__)


if __name__ == "__main__":
    unittest.main()
