"""Competition-association statistic change tracking."""

import aiohttp
import asyncio

from scraper.infrastructure.blockout.association_stats import (
    UpdateAssociationStatsInternalRequest,
)
from scraper.infrastructure.blockout.competitions import (
    get_active_team_associations_by_pool,
    update_team_association_stats,
)
from scraper.observability.logging import log_event

AssociationEntry = tuple[
    UpdateAssociationStatsInternalRequest | None,
    UpdateAssociationStatsInternalRequest,
]


class AssociationChangeSet:
    """Accumulate or replace ranking statistics before one owner write."""

    def __init__(self, session: aiohttp.ClientSession) -> None:
        self._session = session
        self.entries: dict[tuple[int, int], AssociationEntry] = {}
        self._touched: set[tuple[int, int]] = set()

    async def load(self, pool_id: int) -> None:
        """Load active owner associations and reset their candidate statistics."""
        try:
            associations = (
                await get_active_team_associations_by_pool(self._session, pool_id) or []
            )
            for association in associations:
                original = UpdateAssociationStatsInternalRequest(
                    played=association.played,
                    wins=association.wins,
                    losses=association.losses,
                    points=association.points,
                    winsThreeToZero=association.winsThreeToZero,
                    winsThreeToOne=association.winsThreeToOne,
                    winsThreeToTwo=association.winsThreeToTwo,
                    lossesZeroToThree=association.lossesZeroToThree,
                    lossesOneToThree=association.lossesOneToThree,
                    lossesTwoToThree=association.lossesTwoToThree,
                    wonPoints=association.wonPoints,
                    lostPoints=association.lostPoints,
                    wonSets=association.wonSets,
                    lostSets=association.lostSets,
                    pointsPenalty=association.pointsPenalty,
                    coefSets=association.coefSets,
                    coefPoints=association.coefPoints,
                )
                self.entries[(association.poolId, association.teamId)] = (
                    original,
                    UpdateAssociationStatsInternalRequest(),
                )
        except Exception as error:
            log_event(
                action="init_associations_cache_error",
                level="error",
                poolId=pool_id,
                error=str(error),
                message="Erreur lors du chargement des associations existantes",
            )

    def accumulate(
        self,
        pool_id: int,
        team_id: int,
        stats: UpdateAssociationStatsInternalRequest,
    ) -> None:
        """Accumulate one match statistic line for an association."""
        _, updated = self._entry(pool_id, team_id)
        try:
            updated.add(
                played=stats.played,
                wins=stats.wins,
                losses=stats.losses,
                points=stats.points,
                winsThreeToZero=stats.winsThreeToZero,
                winsThreeToOne=stats.winsThreeToOne,
                winsThreeToTwo=stats.winsThreeToTwo,
                lossesZeroToThree=stats.lossesZeroToThree,
                lossesOneToThree=stats.lossesOneToThree,
                lossesTwoToThree=stats.lossesTwoToThree,
                wonPoints=stats.wonPoints,
                lostPoints=stats.lostPoints,
                wonSets=stats.wonSets,
                lostSets=stats.lostSets,
                pointsPenalty=stats.pointsPenalty,
            )
            self._touched.add((pool_id, team_id))
        except Exception as error:
            log_event(
                action="schedule_association_update_error",
                level="error",
                poolId=pool_id,
                teamId=team_id,
                error=str(error),
                message="Erreur lors de l'ajout des statistiques pour l'association.",
            )

    def replace(
        self,
        pool_id: int,
        team_id: int,
        stats: UpdateAssociationStatsInternalRequest,
    ) -> None:
        """Replace all owner statistics with an authoritative provider row."""
        _, updated = self._entry(pool_id, team_id)
        raw_fields = (
            "played",
            "wins",
            "losses",
            "points",
            "winsThreeToZero",
            "winsThreeToOne",
            "winsThreeToTwo",
            "lossesZeroToThree",
            "lossesOneToThree",
            "lossesTwoToThree",
            "wonPoints",
            "lostPoints",
            "wonSets",
            "lostSets",
            "pointsPenalty",
        )
        for field_name in raw_fields:
            setattr(updated, field_name, getattr(stats, field_name))
        updated.pointsPenalty = abs(stats.points - updated.points)
        self._touched.add((pool_id, team_id))

    async def flush(self) -> None:
        """Calculate coefficients, write changed entries, then clear the cache."""
        updates = []
        for (pool_id, team_id), (original, updated) in self.entries.items():
            if (pool_id, team_id) not in self._touched:
                continue
            updated.coefSets = (
                round(updated.wonSets / updated.lostSets, 3)
                if updated.lostSets > 0
                else 1000.0
            )
            updated.coefPoints = (
                round(updated.wonPoints / updated.lostPoints, 3)
                if updated.lostPoints > 0
                else 1000.0
            )
            if original is None or original != updated:
                updates.append(
                    update_team_association_stats(
                        self._session, pool_id, team_id, updated
                    )
                )
        if updates:
            await asyncio.gather(*updates)
        self.entries.clear()
        self._touched.clear()

    def _entry(self, pool_id: int, team_id: int) -> AssociationEntry:
        key = (pool_id, team_id)
        self.entries.setdefault(
            key,
            (None, UpdateAssociationStatsInternalRequest()),
        )
        return self.entries[key]
