from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True, slots=True)
class BulkDeactivateClubsInternalRequest:
    """Exact handwritten mirror of competition-service's cascade request."""

    missingClubIds: list[str]

    def to_json(self) -> dict[str, list[str]]:
        """Return the native camelCase JSON object."""
        return asdict(self)
