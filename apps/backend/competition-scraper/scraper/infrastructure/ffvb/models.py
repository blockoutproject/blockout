"""Typed records owned by the FFVB provider boundary."""

from dataclasses import dataclass


@dataclass(frozen=True)
class FfvbLeagueSource:
    """One FFVB league or committee discovered from an index page."""

    code: str
    name: str
    url: str


@dataclass(frozen=True)
class FfvbPoolSource:
    """One FFVB pool discovered from a provider navigation page."""

    code: str
    name: str
    raw_division_name: str
    season: str
    url: str


@dataclass(frozen=True)
class FfvbCalendarMatch:
    """One normalized row from an FFVB calendar export."""

    league_code: str
    match_code: str
    home_club_id: str
    away_club_id: str
    home_team_name: str
    away_team_name: str
    match_date: str
    match_time: str
    set_score: str | None
    points_score: str | None
    venue: str | None
    first_referee: str | None
    second_referee: str | None


@dataclass(frozen=True)
class FfvbCalendarSnapshot:
    """A calendar observation and whether every provider row was usable."""

    matches: tuple[FfvbCalendarMatch, ...]
    complete: bool


@dataclass(frozen=True)
class FfvbRanking:
    """One normalized row from an FFVB ranking table."""

    team_name: str
    points: int
    played: int
    wins: int
    losses: int
    wins_three_to_zero: int
    wins_three_to_one: int
    wins_three_to_two: int
    losses_two_to_three: int
    losses_one_to_three: int
    losses_zero_to_three: int
    won_sets: int
    lost_sets: int
    coefficient_sets: float
    won_points: int
    lost_points: int
    coefficient_points: float
