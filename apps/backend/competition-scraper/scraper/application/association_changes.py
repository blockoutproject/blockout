"""Competition-association statistic change tracking."""

import asyncio

from scraper.application.ports import BlockoutPort
from scraper.domain.models import AssociationStats
from scraper.observability.logging import log_event

AssociationEntry = tuple[
    AssociationStats | None,
    AssociationStats,
]


class AssociationChangeSet:
    """Accumulate or replace ranking statistics before one owner write."""

    def __init__(self, blockout: BlockoutPort) -> None:
        self._blockout = blockout
        self.entries: dict[tuple[int, int], AssociationEntry] = {}
        self._touched: set[tuple[int, int]] = set()

    async def load(self, pool_id: int) -> None:
        """Load active owner associations and reset their candidate statistics."""
        try:
            associations = await self._blockout.get_active_team_associations(pool_id)
            for association in associations:
                original = AssociationStats(
                    played=association.played,
                    wins=association.wins,
                    losses=association.losses,
                    points=association.points,
                    wins_three_to_zero=association.wins_three_to_zero,
                    wins_three_to_one=association.wins_three_to_one,
                    wins_three_to_two=association.wins_three_to_two,
                    losses_zero_to_three=association.losses_zero_to_three,
                    losses_one_to_three=association.losses_one_to_three,
                    losses_two_to_three=association.losses_two_to_three,
                    won_points=association.won_points,
                    lost_points=association.lost_points,
                    won_sets=association.won_sets,
                    lost_sets=association.lost_sets,
                    points_penalty=association.points_penalty,
                    coefficient_sets=association.coefficient_sets,
                    coefficient_points=association.coefficient_points,
                )
                self.entries[(association.pool_id, association.team_id)] = (
                    original,
                    AssociationStats(),
                )
        except Exception as error:
            log_event(
                action="init_associations_cache_error",
                level="error",
                pool_id=pool_id,
                error_type=type(error).__name__,
                message="Erreur lors du chargement des associations existantes",
            )

    def accumulate(
        self,
        pool_id: int,
        team_id: int,
        stats: AssociationStats,
    ) -> None:
        """Accumulate one match statistic line for an association."""
        _, updated = self._entry(pool_id, team_id)
        try:
            updated.add(stats)
            self._touched.add((pool_id, team_id))
        except Exception as error:
            log_event(
                action="schedule_association_update_error",
                level="error",
                pool_id=pool_id,
                team_id=team_id,
                error_type=type(error).__name__,
                message="Erreur lors de l'ajout des statistiques pour l'association.",
            )

    def replace(
        self,
        pool_id: int,
        team_id: int,
        stats: AssociationStats,
    ) -> None:
        """Replace all owner statistics with an authoritative provider row."""
        _, updated = self._entry(pool_id, team_id)
        raw_fields = (
            "played",
            "wins",
            "losses",
            "points",
            "wins_three_to_zero",
            "wins_three_to_one",
            "wins_three_to_two",
            "losses_zero_to_three",
            "losses_one_to_three",
            "losses_two_to_three",
            "won_points",
            "lost_points",
            "won_sets",
            "lost_sets",
            "points_penalty",
        )
        for field_name in raw_fields:
            setattr(updated, field_name, getattr(stats, field_name))
        updated.points_penalty = abs(stats.points - updated.points)
        self._touched.add((pool_id, team_id))

    async def flush(self) -> None:
        """Calculate coefficients, write changed entries, then clear the cache."""
        updates = []
        for (pool_id, team_id), (original, updated) in self.entries.items():
            if (pool_id, team_id) not in self._touched:
                continue
            updated.coefficient_sets = (
                round(updated.won_sets / updated.lost_sets, 3)
                if updated.lost_sets > 0
                else 1000.0
            )
            updated.coefficient_points = (
                round(updated.won_points / updated.lost_points, 3)
                if updated.lost_points > 0
                else 1000.0
            )
            if original is None or original != updated:
                updates.append(
                    self._blockout.update_association_stats(pool_id, team_id, updated)
                )
        if updates:
            await asyncio.gather(*updates)
        self.entries.clear()
        self._touched.clear()

    def _entry(self, pool_id: int, team_id: int) -> AssociationEntry:
        key = (pool_id, team_id)
        self.entries.setdefault(
            key,
            (None, AssociationStats()),
        )
        return self.entries[key]
