"""Match change tracking across multiple provider inputs."""

from dataclasses import replace

from blockout_contract_clients.match.api.match_api import MatchApi

from scraper.application.models import Match
from scraper.domain.data_source_priority import DataSourcePriority
from scraper.infrastructure.blockout.matches import (
    create_match,
    get_matches_by_pool,
    update_match,
)
from scraper.observability.logging import log_event

MatchEntry = tuple[
    Match | None,
    Match,
    list[str],
    DataSourcePriority,
]


class MatchChangeSet:
    """Merge provider-owned fields and flush match writes in a stable order."""

    def __init__(
        self,
        api: MatchApi | None,
        priority_validation_enabled: bool,
    ) -> None:
        self._api = api
        self._priority_validation_enabled = priority_validation_enabled
        self.entries: dict[tuple[str, str], MatchEntry] = {}

    async def load(self, pool_id: int) -> None:
        """Load existing pool matches with database ownership priority."""
        try:
            existing_matches = await get_matches_by_pool(self._required_api(), pool_id)
            for match in existing_matches:
                key = (match.league_code, match.match_code)
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
        candidate: Match,
        prefix: str,
        priority: DataSourcePriority,
    ) -> None:
        """Merge one provider candidate according to field ownership priority."""
        try:
            key = (candidate.league_code, candidate.match_code)
            self.entries.setdefault(key, (None, candidate, [], priority))
            existing, updated, changes, current_priority = self.entries[key]

            if existing is not None and not existing.active:
                updated.active = True
                changes.append(f"[{prefix}] Match réactivé")

            lnv_xml_fields = ("match_date", "score", "set")
            lnv_html_field = "live_code"
            ffvb_fields = (
                "pool_id",
                "team_id_a",
                "team_id_b",
                "venue",
                "first_referee",
                "second_referee",
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
                match_code=candidate.match_code,
                league_code=candidate.league_code,
                error=str(error),
                message=f"Erreur lors de la fusion de match {candidate.match_code}",
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
                    await create_match(self._required_api(), updated)
                elif changes:
                    await update_match(self._required_api(), updated, changes)
            except Exception as error:
                log_event(
                    action="finalize_matches_update_error",
                    level="error",
                    match_code=updated.match_code,
                    league_code=league_code,
                    error=str(error),
                    message=f"Erreur finalize match {updated.match_code}",
                )
        self.entries.clear()

    @staticmethod
    def _replace_fields(
        updated: Match,
        candidate: Match,
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

    def _required_api(self) -> MatchApi:
        if self._api is None:
            raise RuntimeError(
                "The generated matches-service client is not configured."
            )
        return self._api
