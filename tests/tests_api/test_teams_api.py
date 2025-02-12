from urllib.parse import urlencode
import aiohttp
import pytest
from aioresponses import aioresponses
from api.teams_api import (
    create_team,
    update_team,
)
from tests.utils.fake_team_factory import FakeTeamFactory

TEAM_API_URL = "http://localhost:8082/api/teams"


@pytest.fixture
async def session():
    async with aiohttp.ClientSession() as session:
        yield session


@pytest.fixture
def mocked_aioresponses():
    with aioresponses(strict=True) as m:
        yield m

@pytest.mark.asyncio
async def test_create_team(session, mocked_aioresponses):
    factory = FakeTeamFactory()
    team = factory.create()

    url = TEAM_API_URL
    mocked_aioresponses.post(url, payload=team.to_dict())

    result = await create_team(session, team)

    assert result.name == team.name
    assert result.club_id == team.club_id
    assert result.active == team.active


@pytest.mark.asyncio
async def test_update_team(session, mocked_aioresponses):
    factory = FakeTeamFactory()
    team = factory.create()

    team.name = "Updated Team Name"
    team.active = False

    url = f"{TEAM_API_URL}/{team.id}"
    mocked_aioresponses.put(url, payload=team.to_dict())

    result = await update_team(session, team, changes_list=["name", "active"])

    assert result.name == "Updated Team Name"
    assert result.active is False