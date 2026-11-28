import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";

/** Canonical season lifecycle copy, distinct from source readiness and running collection. */
export function seasonStatus(season: CollectionSeasonResponse) {
  return (
    {
      preparing: { label: "À préparer", tone: "warning" },
      active: { label: "Active", tone: "success" },
      closed: { label: "Clôturée", tone: "error" },
    } as const
  )[season.state];
}
