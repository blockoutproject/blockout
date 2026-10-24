import type { ReactNode } from "react";
import type {
  CalendarCategoryEnum,
  PoolSummaryResponse,
} from "../../../../.generated/schemas/index.zod";

/** One club calendar shares the exact currently selected season with the teams tab. */
export interface ClubCalendarSelection {
  clubId: string;
  seasonId: string;
  category: CalendarCategoryEnum;
}

/** Team calendars aggregate all participations under the team's stable identity. */
export interface TeamCalendarSelection {
  teamId: string;
  category: CalendarCategoryEnum;
}

/** A pool calendar retains its exact phase/resource identity. */
export interface PoolCalendarSelection {
  poolId: string;
  category: CalendarCategoryEnum;
}

/** Phase labels disambiguate same-named participations without inventing a new identity. */
export function poolLabel(pool: PoolSummaryResponse): string {
  return [pool.pool.name, pool.phaseName].filter(Boolean).join(" · ");
}

/** Later-story composition boundary; content is rendered only for the active exact pool. */
export type RenderStandings = (pool: PoolSummaryResponse) => ReactNode;
