"""Application models shared across competition ingestion workflows."""

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class RawDivisionMapping:
    """Provider Division name and its optional Blockout classification."""

    raw_division_name: str
    league_code: str
    season: str
    id: int | None = None
    division_id: int | None = None
    format: str | None = None
    gender: str | None = None
    created_at: datetime | None = None
    last_update: datetime | None = None
    mapped: bool | None = None

    def is_mapped(self) -> bool:
        """Return whether every classification component is present."""
        return (
            self.division_id is not None
            and self.format is not None
            and self.gender is not None
        )


@dataclass(slots=True)
class Team:
    """Team state used by competition ingestion independently of HTTP transport."""

    club_id: str
    raw_name: str
    name: str
    short_name: str
    league_code: str
    division_id: int
    season: str
    gender: str | None = None
    format: str | None = None
    id: int | None = None
    followers_count: int | None = 0
    logo_url: str | None = None
    active: bool = True
    created_at: datetime | None = None
    last_update: datetime | None = None


@dataclass(slots=True)
class Pool:
    """Pool state used by competition ingestion independently of HTTP transport."""

    pool_code: str
    league_code: str
    season: str
    division_id: int
    league_name: str
    raw_name: str
    name: str
    short_name: str
    format: str
    gender: str
    followers_count: int | None = 0
    active: bool = True
    id: int | None = None
    created_at: datetime | None = None
    last_update: datetime | None = None


@dataclass(slots=True)
class CompetitionAssociation:
    """Pool-Team association state used independently of HTTP transport."""

    pool_id: int
    team_id: int
    club_id: str
    id: int | None = None
    active: bool = True
    played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0
    wins_three_to_zero: int = 0
    wins_three_to_one: int = 0
    wins_three_to_two: int = 0
    losses_zero_to_three: int = 0
    losses_one_to_three: int = 0
    losses_two_to_three: int = 0
    won_sets: int = 0
    lost_sets: int = 0
    won_points: int = 0
    lost_points: int = 0
    points_penalty: int = 0
    coefficient_sets: float = 0.0
    coefficient_points: float = 0.0
    created_at: datetime | None = None
    last_update: datetime | None = None


@dataclass(slots=True)
class AssociationStats:
    """Ranking totals calculated by ingestion before a service write."""

    played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0
    wins_three_to_zero: int = 0
    wins_three_to_one: int = 0
    wins_three_to_two: int = 0
    losses_zero_to_three: int = 0
    losses_one_to_three: int = 0
    losses_two_to_three: int = 0
    won_sets: int = 0
    lost_sets: int = 0
    won_points: int = 0
    lost_points: int = 0
    coefficient_sets: float = 0.0
    coefficient_points: float = 0.0
    points_penalty: int = 0

    def add(self, other: "AssociationStats") -> None:
        """Accumulate one match contribution into these ranking totals."""
        self.played += other.played
        self.wins += other.wins
        self.losses += other.losses
        self.points += other.points
        self.wins_three_to_zero += other.wins_three_to_zero
        self.wins_three_to_one += other.wins_three_to_one
        self.wins_three_to_two += other.wins_three_to_two
        self.losses_zero_to_three += other.losses_zero_to_three
        self.losses_one_to_three += other.losses_one_to_three
        self.losses_two_to_three += other.losses_two_to_three
        self.won_sets += other.won_sets
        self.lost_sets += other.lost_sets
        self.won_points += other.won_points
        self.lost_points += other.lost_points
        self.points_penalty += other.points_penalty
