import type { PoolSummaryResponse } from "../../../../.generated/schemas/index.zod";

/** Adds the known phase only when the published pool name does not already end with it. */
export function poolLabel(pool: PoolSummaryResponse): string {
  return pool.phaseName && !pool.pool.name.endsWith(pool.phaseName)
    ? `${pool.pool.name} · ${pool.phaseName}`
    : pool.pool.name;
}
