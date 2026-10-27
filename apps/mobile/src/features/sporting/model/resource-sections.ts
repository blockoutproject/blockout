import type { ReactNode } from "react";
import type { PoolSummaryResponse } from "../../../../.generated/schemas/index.zod";

/** Phase labels disambiguate same-named participations without inventing a new identity. */
export function poolLabel(pool: PoolSummaryResponse): string {
  return [pool.pool.name, pool.phaseName].filter(Boolean).join(" · ");
}

/** Later-story content for one exact pool; the resource page owns lazy panel mounting. */
export type RenderStandings = (pool: PoolSummaryResponse) => ReactNode;
