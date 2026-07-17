from __future__ import annotations

import asyncio
import importlib
import importlib.util
import inspect
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest


WORKSPACE_ROOT = Path(__file__).resolve().parents[6]
CLIENT_ROOT = WORKSPACE_ROOT / "libs/shared/contracts/clients/python"
sys.path.insert(0, str(CLIENT_ROOT / "src"))


def load_factory(scraper: str) -> types.ModuleType:
    path = WORKSPACE_ROOT / f"apps/scrapers/{scraper}/api/blockout_client.py"
    spec = importlib.util.spec_from_file_location(f"{scraper}_blockout_client", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class GeneratedClientTests(unittest.TestCase):
    def test_python_runtime_and_six_packages(self) -> None:
        self.assertGreaterEqual(sys.version_info, (3, 12))
        for service in (
            "config_service",
            "clubs_service",
            "teams_service",
            "pools_service",
            "competition_service",
            "matches_service",
        ):
            module = importlib.import_module(f"blockout_contract_clients.{service}")
            self.assertIsNotNone(module)

    def test_all_twenty_four_audited_calls_resolve_to_async_methods(self) -> None:
        manifest = json.loads((CLIENT_ROOT / "operation-manifest.json").read_text())
        operations = manifest["club"] + manifest["competition"]
        self.assertEqual(6, len(manifest["club"]))
        self.assertEqual(18, len(manifest["competition"]))
        self.assertEqual(24, len(operations))

        for audit_id, service, api_module_name, method_name in operations:
            api_module = importlib.import_module(
                f"blockout_contract_clients.{service}.api.{api_module_name}"
            )
            owners = [
                owner
                for _, owner in inspect.getmembers(api_module, inspect.isclass)
                if owner.__module__ == api_module.__name__ and hasattr(owner, method_name)
            ]
            self.assertEqual(1, len(owners), f"{audit_id} must resolve exactly once")
            self.assertTrue(inspect.iscoroutinefunction(getattr(owners[0], method_name)), audit_id)

    def test_generated_models_translate_snake_case_to_camel_case(self) -> None:
        from blockout_contract_clients.config_service.models.create_raw_division_mapping_internal_request import (
            CreateRawDivisionMappingInternalRequest,
        )

        model = CreateRawDivisionMappingInternalRequest(
            raw_division_name="Senior M",
            division_id=None,
            league_code="ARA",
            season="2026",
        )
        wire = model.to_dict()
        self.assertEqual("Senior M", wire["rawDivisionName"])
        self.assertIsNone(wire["divisionId"])
        self.assertEqual("ARA", wire["leagueCode"])
        self.assertNotIn("raw_division_name", wire)
        self.assertEqual("Senior M", CreateRawDivisionMappingInternalRequest.from_dict(wire).raw_division_name)

    def test_query_path_list_and_empty_response_shapes_are_generated(self) -> None:
        from blockout_contract_clients.matches_service.api.matches_api import MatchesApi
        from blockout_contract_clients.matches_service.api_client import ApiClient
        from blockout_contract_clients.matches_service.configuration import Configuration
        from blockout_contract_clients.matches_service.models.match_internal_page_response import (
            MatchInternalPageResponse,
        )
        from blockout_contract_clients.matches_service.models.page_info import PageInfo

        client = ApiClient(Configuration(host="https://blockout.invalid"))
        api = MatchesApi(client)
        serialized = api._list_matches_serialize(
            pool_id=7,
            team_ids=[11, 12],
            status=None,
            active=True,
            page=0,
            page_size=50,
            _request_auth=None,
            _content_type=None,
            _headers=None,
            _host_index=0,
        )
        self.assertIn("poolId=7", serialized[1])
        self.assertIn("teamIds=11", serialized[1])
        self.assertIn("pageSize=50", serialized[1])
        path = client.param_serialize(
            method="GET",
            resource_path="/api/v2/matches/{id}",
            path_params={"id": 42},
            query_params=[],
            header_params={},
        )[1]
        self.assertTrue(path.endswith("/api/v2/matches/42"))
        page = MatchInternalPageResponse(
            items=[],
            page_info=PageInfo(page=0, page_size=50, total_items=0, has_next=False),
        )
        self.assertEqual([], page.items)
        source = inspect.getsource(MatchesApi.bulk_deactivate_matches_by_pool)
        self.assertIn("'204': None", source)

    def test_generated_multipart_signature_and_file_lifecycle(self) -> None:
        from blockout_contract_clients.clubs_service.api.clubs_api import ClubsApi
        from blockout_contract_clients.clubs_service.api_client import ApiClient
        from blockout_contract_clients.clubs_service.configuration import Configuration

        signature = inspect.signature(ClubsApi.create_club)
        self.assertIn("data", signature.parameters)
        self.assertIn("image", signature.parameters)
        client = ApiClient(Configuration(host="https://blockout.invalid"))
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as image:
            image.write(b"png")
            image_path = Path(image.name)
        try:
            parameters = client.files_parameters({"image": str(image_path)})
            self.assertEqual("image", parameters[0][0])
            self.assertEqual(b"png", parameters[0][1][1])
            image_path.unlink()
            self.assertFalse(image_path.exists())
        finally:
            image_path.unlink(missing_ok=True)

    def test_generated_transport_exposes_proxy_timeout_close_and_no_retry(self) -> None:
        from blockout_contract_clients.config_service.api_client import ApiClient
        from blockout_contract_clients.config_service.configuration import Configuration
        from blockout_contract_clients.config_service.rest import RESTClientObject

        configuration = Configuration(
            host="https://blockout.invalid",
            proxy="http://proxy.invalid:8080",
            retries=None,
            connection_pool_maxsize=20,
        )
        transport = RESTClientObject(configuration)
        self.assertEqual(20, transport.maxsize)
        self.assertEqual("http://proxy.invalid:8080", transport.proxy)
        self.assertIsNone(transport._effective_retry_options)
        self.assertIn('"trust_env": True', inspect.getsource(transport._create_pool_manager))
        self.assertTrue(inspect.iscoroutinefunction(ApiClient.close))
        self.assertIn("_request_timeout", inspect.signature(ApiClient.call_api).parameters)

    def test_generated_source_is_not_imported_outside_blockout_adapter_foundation(self) -> None:
        imports = []
        for scraper in ("club-scraper", "competition-scraper"):
            for source in (WORKSPACE_ROOT / f"apps/scrapers/{scraper}").rglob("*.py"):
                if "blockout_contract_clients" in source.read_text():
                    imports.append(source)
        self.assertEqual([], imports)

    def test_match_live_operations_have_separate_generated_async_owners(self) -> None:
        owners = {
            "match_live_link_history_api": {"list_match_live_link_history"},
            "match_live_link_reports_api": {"report_match_live_link"},
            "match_live_links_api": {"delete_match_live_link", "upsert_match_live_link"},
            "match_moderation_api": {
                "approve_match_live_link",
                "list_matches_for_live_moderation",
                "reactivate_match_live_link",
                "reject_match_live_link",
            },
        }
        all_operations = set().union(*owners.values())

        for module_name, expected_operations in owners.items():
            module = importlib.import_module(
                f"blockout_contract_clients.matches_service.api.{module_name}"
            )
            generated_api = next(
                owner
                for _, owner in inspect.getmembers(module, inspect.isclass)
                if owner.__module__ == module.__name__
            )
            for operation in expected_operations:
                self.assertTrue(inspect.iscoroutinefunction(getattr(generated_api, operation)))
            self.assertEqual(
                set(),
                (all_operations - expected_operations).intersection(dir(generated_api)),
            )


class BlockoutClientFactoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_factories_refresh_bearer_before_each_call_and_close(self) -> None:
        factory = load_factory("club-scraper")

        class Configuration:
            def __init__(self, **kwargs):
                self.__dict__.update(kwargs)
                self.access_token = None

        class ApiClient:
            def __init__(self, configuration):
                self.configuration = configuration
                self.closed = False

            async def close(self):
                self.closed = True

        tokens = iter(("first", "second"))
        client = factory.create_run_client(Configuration, ApiClient, "https://blockout.invalid", lambda: next(tokens))
        seen = []

        async def operation(*, _request_timeout):
            seen.append((client.configuration.access_token, _request_timeout))
            return "ok"

        async with client:
            self.assertEqual("ok", await client.invoke(operation))
            self.assertEqual("ok", await client.invoke(operation))

        self.assertEqual([("first", 60), ("second", 60)], seen)
        self.assertIsNone(client.configuration.retries)
        self.assertEqual(20, client.configuration.connection_pool_maxsize)
        self.assertTrue(client.api_client.closed)

    async def test_competition_profile_and_generated_error_mapping(self) -> None:
        factory = load_factory("competition-scraper")

        class GeneratedError(Exception):
            status = 409
            body = json.dumps(
                {
                    "code": "competition_conflict",
                    "requestId": "request-123",
                    "authorization": "secret",
                }
            )
            headers = {}

        mapped = factory.BlockoutApiError.from_generated(GeneratedError())
        self.assertEqual(409, mapped.status)
        self.assertEqual("competition_conflict", mapped.code)
        self.assertEqual("request-123", mapped.request_id)
        self.assertNotIn("secret", mapped.safe_body)
        self.assertEqual(10, factory.STATUS_TIMEOUT_SECONDS)
        self.assertEqual(10, factory.RUN_TIMEOUT_SECONDS)


if __name__ == "__main__":
    unittest.main()
