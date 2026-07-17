from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import importlib
from pathlib import Path
import sys
import types
import unittest
from unittest import mock


WORKSPACE_ROOT = Path(__file__).resolve().parents[6]
CLIENT_ROOT = WORKSPACE_ROOT / "libs/shared/contracts/clients/python"
COMPETITION_SCRAPER_ROOT = WORKSPACE_ROOT / "apps/scrapers/competition-scraper"
sys.path.insert(0, str(CLIENT_ROOT / "src"))


class FakeBlockoutClient:
    def __init__(self, responses: dict[str, list[object]]):
        self.api_client = object()
        self.responses = responses
        self.calls: list[tuple[str, dict[str, object]]] = []

    async def invoke(self, operation, *args, **kwargs):
        name = operation.__name__
        self.calls.append((name, kwargs))
        return self.responses[name].pop(0)


@contextmanager
def competition_scraper_modules():
    prefixes = ("api", "config", "models")
    saved = {
        name: module
        for name, module in sys.modules.items()
        if name in prefixes or name.startswith(tuple(f"{prefix}." for prefix in prefixes))
    }
    for name in saved:
        sys.modules.pop(name, None)
    sys.path.insert(0, str(COMPETITION_SCRAPER_ROOT))
    try:
        yield
    finally:
        for name in list(sys.modules):
            if name in prefixes or name.startswith(tuple(f"{prefix}." for prefix in prefixes)):
                sys.modules.pop(name, None)
        sys.modules.update(saved)
        sys.path.remove(str(COMPETITION_SCRAPER_ROOT))


def association_response(pool_id: int = 7, team_id: int = 11, *, active: bool = True):
    from blockout_contract_clients.competition_service.models.competition_association_internal_response import (
        CompetitionAssociationInternalResponse,
    )

    return CompetitionAssociationInternalResponse(
        pool_id=pool_id,
        team_id=team_id,
        club_id="club-1",
        active=active,
        points=9,
        played=3,
        wins=3,
        losses=0,
        wins_three_to_zero=1,
        wins_three_to_one=1,
        wins_three_to_two=1,
        losses_zero_to_three=0,
        losses_one_to_three=0,
        losses_two_to_three=0,
        won_sets=9,
        lost_sets=3,
        won_points=225,
        lost_points=180,
        points_penalty=0,
        coef_sets=3.0,
        coef_points=1.25,
    )


def match_response(identifier: int = 41):
    from blockout_contract_clients.matches_service.models.match_internal_response import MatchInternalResponse
    from blockout_contract_clients.matches_service.models.match_status_enum import MatchStatusEnum

    return MatchInternalResponse(
        id=identifier,
        match_code="M-41",
        league_code="ARA",
        pool_id=7,
        live_code=9001,
        team_id_a=11,
        team_id_b=12,
        match_date=datetime(2026, 10, 5, 18, tzinfo=timezone.utc),
        season="2026/2027",
        set="3-0",
        score="75-60",
        status=MatchStatusEnum.FINISHED,
        venue="Arena",
        first_referee="A",
        second_referee="B",
        active=True,
    )


def pool_response(identifier: int = 7):
    from blockout_contract_clients.pools_service.models.format_enum import FormatEnum
    from blockout_contract_clients.pools_service.models.gender_enum import GenderEnum
    from blockout_contract_clients.pools_service.models.pool_internal_response import PoolInternalResponse

    return PoolInternalResponse(
        id=identifier,
        pool_code="PA",
        league_code="ARA",
        season="2026/2027",
        league_name="Auvergne Rhône-Alpes",
        raw_name="Senior M",
        name="Senior M",
        short_name="SM",
        division_id=3,
        format=FormatEnum.SIX,
        gender=GenderEnum.M,
        followers_count=4,
        active=True,
    )


def team_response(identifier: int = 11):
    from blockout_contract_clients.teams_service.models.format_enum import FormatEnum
    from blockout_contract_clients.teams_service.models.gender_enum import GenderEnum
    from blockout_contract_clients.teams_service.models.team_internal_response import TeamInternalResponse

    return TeamInternalResponse(
        id=identifier,
        club_id="club-1",
        raw_name="Raw Team",
        name="Team",
        short_name="TM",
        league_code="ARA",
        division_id=3,
        season="2026/2027",
        format=FormatEnum.SIX,
        gender=GenderEnum.M,
        followers_count=2,
        logo_url=None,
        active=True,
    )


class CompetitionScraperGeneratedAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_run_bundle_owns_five_generated_client_lifecycles(self) -> None:
        with competition_scraper_modules():
            from api import blockout_client

            fake_env = types.ModuleType("config.env_config")
            fake_env.CONFIG_API_URL = "https://config.invalid"
            fake_env.TEAM_API_URL = "https://teams.invalid"
            fake_env.POOL_API_URL = "https://pools.invalid"
            fake_env.COMPETITION_API_URL = "https://competition.invalid"
            fake_env.MATCH_API_URL = "https://matches.invalid"
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

            with mock.patch.dict(sys.modules, {"config.env_config": fake_env}):
                with mock.patch.object(
                    blockout_client,
                    "create_run_client",
                    side_effect=lambda configuration, api_client, host, token: ClientContext(host),
                ):
                    async with blockout_client.create_run_clients(lambda: "token") as clients:
                        self.assertEqual("https://config.invalid", clients.config.host)
                        self.assertEqual("https://teams.invalid", clients.teams.host)
                        self.assertEqual("https://pools.invalid", clients.pools.host)
                        self.assertEqual("https://competition.invalid", clients.competition.host)
                        self.assertEqual("https://matches.invalid", clients.matches.host)
                        self.assertFalse(any(context.closed for context in contexts))

            self.assertEqual(5, len(contexts))
            self.assertTrue(all(context.closed for context in contexts))

    async def test_five_competition_operations_use_generated_models_and_pages(self) -> None:
        from blockout_contract_clients.competition_service.models.competition_association_internal_page_response import (
            CompetitionAssociationInternalPageResponse,
        )
        from blockout_contract_clients.competition_service.models.page_info import PageInfo

        with competition_scraper_modules():
            from api.competitions_api import (
                add_team_to_pool,
                bulk_deactivate_pools,
                bulk_deactivate_teams_by_pool,
                get_active_team_associations_by_pool,
                update_team_association_stats,
            )
            from models.association_stats import AssociationStats

            client = FakeBlockoutClient(
                {
                    "list_competition_associations_by_pool": [
                        CompetitionAssociationInternalPageResponse(
                            items=[association_response(), association_response(team_id=12, active=False)],
                            page_info=PageInfo(page=0, page_size=100, total_items=3, has_next=True),
                        ),
                        CompetitionAssociationInternalPageResponse(
                            items=[association_response(team_id=13)],
                            page_info=PageInfo(page=1, page_size=100, total_items=3, has_next=False),
                        ),
                    ],
                    "add_or_reactivate_competition_association": [association_response()],
                    "bulk_deactivate_competition_teams_by_pool": [None],
                    "bulk_deactivate_competition_pools": [None],
                    "replace_competition_statistics": [association_response()],
                }
            )

            associations = await get_active_team_associations_by_pool(client, 7)
            added = await add_team_to_pool(client, 7, 11, "club-1")
            await bulk_deactivate_teams_by_pool(client, 7, {13, 12})
            await bulk_deactivate_pools(client, {9, 8})
            updated = await update_team_association_stats(client, 7, 11, AssociationStats(points=9))

            self.assertEqual([11, 13], [item.team_id for item in associations])
            self.assertEqual("CompetitionAssociation", type(added).__name__)
            self.assertEqual("CompetitionAssociation", type(updated).__name__)
            self.assertEqual(
                [12, 13], client.calls[3][1]["missing_team_ids_internal_request"].missing_team_ids
            )
            self.assertEqual([8, 9], client.calls[4][1]["missing_pool_ids_internal_request"].missing_pool_ids)
            stats = client.calls[5][1]["competition_statistics_snapshot_internal_request"]
            self.assertEqual(9, stats.to_dict()["points"])

    async def test_three_config_operations_map_generated_types(self) -> None:
        from blockout_contract_clients.config_service.models.format_enum import FormatEnum
        from blockout_contract_clients.config_service.models.gender_enum import GenderEnum
        from blockout_contract_clients.config_service.models.raw_division_mapping_internal_list_response import (
            RawDivisionMappingInternalListResponse,
        )
        from blockout_contract_clients.config_service.models.raw_division_mapping_internal_response import (
            RawDivisionMappingInternalResponse,
        )
        from blockout_contract_clients.config_service.models.scraper_name_enum import ScraperNameEnum
        from blockout_contract_clients.config_service.models.scraper_status_internal_response import (
            ScraperStatusInternalResponse,
        )

        with competition_scraper_modules():
            fake_auth = types.ModuleType("api.auth0")
            fake_auth.get_token = lambda: "token"
            fake_env = types.ModuleType("config.env_config")
            fake_env.CONFIG_API_URL = "https://config.invalid"
            fake_logger = types.ModuleType("config.logger_config")
            fake_logger.log_event = lambda **kwargs: None
            with mock.patch.dict(
                sys.modules,
                {
                    "api.auth0": fake_auth,
                    "config.env_config": fake_env,
                    "config.logger_config": fake_logger,
                },
            ):
                config_api = importlib.import_module("api.config_api")
                from models.raw_division_mapping import RawDivisionMapping

                response = RawDivisionMappingInternalResponse(
                    id=5,
                    raw_division_name="Senior M",
                    division_id=3,
                    format=FormatEnum.SIX,
                    gender=GenderEnum.M,
                    league_code="ARA",
                    season="2026/2027",
                )
                client = FakeBlockoutClient(
                    {
                        "list_raw_division_mappings": [RawDivisionMappingInternalListResponse(items=[response])],
                        "create_raw_division_mapping": [response],
                        "get_scraper_status": [
                            ScraperStatusInternalResponse(name=ScraperNameEnum.SCRAPER, enabled=True)
                        ],
                    }
                )
                mappings = await config_api.get_raw_division_mappings_by_league_and_season(
                    client, "ARA", "2026/2027"
                )
                created = await config_api.create_raw_division_mapping(
                    client,
                    RawDivisionMapping(
                        raw_division_name="Senior M",
                        division_id="3",
                        format="SIX",
                        gender="M",
                        league_code="ARA",
                        season="2026/2027",
                    ),
                )

                class ClientContext:
                    async def __aenter__(self):
                        return client

                    async def __aexit__(self, exc_type, exc, traceback):
                        return None

                with mock.patch.object(config_api, "create_status_client", return_value=ClientContext()):
                    status = await config_api.get_scraper_status("SCRAPER")

                self.assertEqual("3", mappings[0].division_id)
                self.assertEqual("RawDivisionMapping", type(created).__name__)
                command = client.calls[1][1]["create_raw_division_mapping_internal_request"]
                self.assertEqual("Senior M", command.to_dict()["rawDivisionName"])
                self.assertEqual("SCRAPER", status.name)
                self.assertEqual("ScraperStatus", type(status).__name__)

    async def test_four_match_operations_preserve_application_models(self) -> None:
        from blockout_contract_clients.matches_service.models.match_internal_page_response import (
            MatchInternalPageResponse,
        )
        from blockout_contract_clients.matches_service.models.page_info import PageInfo

        with competition_scraper_modules():
            fake_logger = types.ModuleType("config.logger_config")
            fake_logger.log_event = lambda **kwargs: None
            with mock.patch.dict(sys.modules, {"config.logger_config": fake_logger}):
                matches_api = importlib.import_module("api.matches_api")
                from models.match import Match

                client = FakeBlockoutClient(
                    {
                        "list_matches": [
                            MatchInternalPageResponse(
                                items=[match_response()],
                                page_info=PageInfo(page=0, page_size=100, total_items=1, has_next=False),
                            )
                        ],
                        "create_match": [match_response()],
                        "update_match": [match_response()],
                        "bulk_deactivate_matches_by_pool": [None],
                    }
                )
                application_match = Match(
                    id=41,
                    match_code="M-41",
                    league_code="ARA",
                    pool_id=7,
                    team_id_a=11,
                    team_id_b=12,
                    match_date=datetime(2026, 10, 5, 18, tzinfo=timezone.utc),
                    season="2026/2027",
                )

                listed = await matches_api.get_matches_by_pool(client, 7)
                created = await matches_api.create_match(client, application_match)
                updated = await matches_api.update_match(client, application_match, ["score"])
                await matches_api.bulk_deactivate_matches(client, 7, {"M-43", "M-42"})

                self.assertEqual("Match", type(listed[0]).__name__)
                self.assertEqual("Match", type(created).__name__)
                self.assertEqual("Match", type(updated).__name__)
                self.assertEqual(41, client.calls[2][1]["id"])
                command = client.calls[3][1]["missing_match_codes_internal_request"]
                self.assertEqual(["M-42", "M-43"], command.missing_match_codes)

    async def test_three_pool_and_three_team_operations_use_canonical_models(self) -> None:
        from blockout_contract_clients.pools_service.models.page_info import PageInfo as PoolPageInfo
        from blockout_contract_clients.pools_service.models.pool_internal_page_response import PoolInternalPageResponse
        from blockout_contract_clients.teams_service.models.page_info import PageInfo as TeamPageInfo
        from blockout_contract_clients.teams_service.models.team_internal_page_response import TeamInternalPageResponse

        with competition_scraper_modules():
            fake_logger = types.ModuleType("config.logger_config")
            fake_logger.log_event = lambda **kwargs: None
            with mock.patch.dict(sys.modules, {"config.logger_config": fake_logger}):
                pools_api = importlib.import_module("api.pools_api")
                teams_api = importlib.import_module("api.teams_api")
                from models.pool import Pool
                from models.team import Team

                pool_client = FakeBlockoutClient(
                    {
                        "list_pools": [
                            PoolInternalPageResponse(
                                items=[pool_response()],
                                page_info=PoolPageInfo(page=0, page_size=100, total_items=1, has_next=False),
                            )
                        ],
                        "create_pool": [pool_response()],
                        "update_pool": [pool_response()],
                    }
                )
                application_pool = Pool(
                    id=7,
                    pool_code="PA",
                    league_code="ARA",
                    season="2026/2027",
                    division_id="3",
                    league_name="Auvergne Rhône-Alpes",
                    raw_name="Senior M",
                    name="Senior M",
                    short_name="SM",
                    format="SIX",
                    gender="M",
                )
                pools = await pools_api.get_pools_by_league_and_season(pool_client, "ARA", "2026/2027")
                created_pool = await pools_api.create_pool(pool_client, application_pool)
                updated_pool = await pools_api.update_pool(pool_client, application_pool, ["active"])

                team_client = FakeBlockoutClient(
                    {
                        "list_teams": [
                            TeamInternalPageResponse(
                                items=[team_response()],
                                page_info=TeamPageInfo(page=0, page_size=100, total_items=1, has_next=False),
                            )
                        ],
                        "create_team": [team_response()],
                        "update_team": [team_response()],
                    }
                )
                application_team = Team(
                    id=11,
                    club_id="club-1",
                    raw_name="Raw Team",
                    name="Team",
                    short_name="TM",
                    league_code="ARA",
                    division_id="3",
                    season="2026/2027",
                    format="SIX",
                    gender="M",
                )
                teams = await teams_api.get_teams(
                    team_client,
                    division_id="3",
                    format="SIX",
                    gender="M",
                    season="2026/2027",
                )
                created_team = await teams_api.create_team(team_client, application_team)
                updated_team = await teams_api.update_team(team_client, application_team, ["active"])

                self.assertEqual("Pool", type(pools[0]).__name__)
                self.assertEqual("Pool", type(created_pool).__name__)
                self.assertEqual("Pool", type(updated_pool).__name__)
                self.assertEqual("Team", type(teams[0]).__name__)
                self.assertEqual("Team", type(created_team).__name__)
                self.assertEqual("Team", type(updated_team).__name__)
                self.assertEqual(3, pool_client.calls[1][1]["create_pool_internal_request"].division_id)
                update_data = team_client.calls[2][1]["data"]
                self.assertFalse(update_data.to_dict()["removeLogo"])


if __name__ == "__main__":
    unittest.main()
