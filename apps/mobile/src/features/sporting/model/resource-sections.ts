import type { ReactNode } from "react";
import type { PoolSummaryResponse } from "../../../../.generated/schemas/index.zod";

/** Phase labels disambiguate same-named participations without inventing a new identity. */
export function poolLabel(pool: PoolSummaryResponse): string {
  return [pool.pool.name, pool.phaseName].filter(Boolean).join(" · ");
}

/** Later-story composition boundary; content is rendered only for the active exact pool. */
export type RenderStandings = (pool: PoolSummaryResponse) => ReactNode;
