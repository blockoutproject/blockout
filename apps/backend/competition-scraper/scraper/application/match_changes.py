"""Match change tracking across multiple provider inputs."""

import aiohttp
from dataclasses import replace

from scraper.domain.data_source_priority import DataSourcePriority
from scraper.infrastructure.blockout.match import MatchInternalResponse
from scraper.infrastructure.blockout.matches import (
    create_match,
    get_matches_by_pool,
    update_match,
)
from scraper.observability.logging import log_event

MatchEntry = tuple[
    MatchInternalResponse | None,
    MatchInternalResponse,
    list[str],
    DataSourcePriority,
]


class MatchChangeSet:
    """Merge provider-owned fields and flush match writes in a stable order."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        priority_validation_enabled: bool,
    ) -> None:
        self._session = session
        self._priority_validation_enabled = priority_validation_enabled
        self.entries: dict[tuple[str, str], MatchEntry] = {}

    async def load(self, pool_id: int) -> None:
        """Load existing pool matches with database ownership priority."""
        try:
            existing_matches = await get_matches_by_pool(self._session, pool_id) or []
            for match in existing_matches:
                key = (match.leagueCode, match.matchCode)
                self.entries.setdefault(
                    key,
                    (match, replace(match), [], DataSourcePriority.DB),
                )
        except Exception as error:
            log_event(
                action="init_matches_cache_error",
                level="error",
                poolId=pool_id,
                error=str(error),
                message="Erreur lors du chargement des matchs existants",
            )

    def schedule(
        self,
        candidate: MatchInternalResponse,
        prefix: str,
        priority: DataSourcePriority,
    ) -> None:
        """Merge one provider candidate according to field ownership priority."""
        try:
            key = (candidate.leagueCode, candidate.matchCode)
            self.entries.setdefault(key, (None, candidate, [], priority))
            existing, updated, changes, current_priority = self.entries[key]

            if existing is not None and not existing.active:
                updated.active = True
                changes.append(f"[{prefix}] Match réactivé")

            lnv_xml_fields = ("matchDate", "score", "set")
            lnv_html_field = "liveCode"
            ffvb_fields = (
                "poolId",
                "teamIdA",
                "teamIdB",
                "venue",
                "firstReferee",
                "secondReferee",
            )

            if not self._priority_validation_enabled:
                self._replace_fields(
                    updated,
                    candidate,
                    lnv_xml_fields + (lnv_html_field,) + ffvb_fields,
                    changes,
                    prefix,
                )
                self.entries[key] = (existing, updated, changes, priority)
                return

            if priority == DataSourcePriority.LNV_XML:
                self._replace_fields(
                    updated, candidate, lnv_xml_fields, changes, prefix
                )
                self.entries[key] = (existing, updated, changes, priority)
            elif priority == DataSourcePriority.LNV_HTML:
                self._replace_fields(
                    updated, candidate, (lnv_html_field,), changes, prefix
                )
                self.entries[key] = (existing, updated, changes, priority)
            elif priority == DataSourcePriority.FFVB:
                for field_name in ffvb_fields:
                    old_value = getattr(updated, field_name, None)
                    new_value = getattr(candidate, field_name, None)
                    if new_value != old_value and (
                        old_value is None or priority >= current_priority
                    ):
                        setattr(updated, field_name, new_value)
                        changes.append(
                            f"[{prefix}] {field_name}: {old_value} -> {new_value}"
                        )
                self.entries[key] = (existing, updated, changes, current_priority)
        except Exception as error:
            log_event(
                action="schedule_match_changes_error",
                level="error",
                matchCode=candidate.matchCode,
                leagueCode=candidate.leagueCode,
                error=str(error),
                message=f"Erreur lors de la fusion de match {candidate.matchCode}",
            )

    async def flush(self) -> None:
        """Create or update each changed match and isolate individual failures."""
        for (league_code, _match_code), (
                existing,
                updated,
                changes,
                _priority,
        ) in self.entries.items():
            try:
                if existing is None:
                    await create_match(self._session, updated)
                elif changes:
                    await update_match(self._session, updated, changes)
            except Exception as error:
                log_event(
                    action="finalize_matches_update_error",
                    level="error",
                    matchCode=updated.matchCode,
                    leagueCode=league_code,
                    error=str(error),
                    message=f"Erreur finalize match {updated.matchCode}",
                )
        self.entries.clear()

    @staticmethod
    def _replace_fields(
        updated: MatchInternalResponse,
        candidate: MatchInternalResponse,
        field_names: tuple[str, ...],
        changes: list[str],
        prefix: str,
    ) -> None:
        for field_name in field_names:
            old_value = getattr(updated, field_name, None)
            new_value = getattr(candidate, field_name, None)
            if new_value != old_value:
                setattr(updated, field_name, new_value)
                changes.append(f"[{prefix}] {field_name}: {old_value} -> {new_value}")
