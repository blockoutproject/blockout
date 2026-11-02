import type { ReactNode } from "react";
import type { PoolSummaryResponse } from "../../../../.generated/schemas/index.zod";

/** Adds the known phase only when the published pool name does not already end with it. */
export function poolLabel(pool: PoolSummaryResponse): string {
  return pool.phaseName && !pool.pool.name.endsWith(pool.phaseName)
    ? `${pool.pool.name} · ${pool.phaseName}`
    : pool.pool.name;
}

/** Later-story content for one exact pool; the resource page owns lazy panel mounting. */
export type RenderStandings = (pool: PoolSummaryResponse) => ReactNode;
