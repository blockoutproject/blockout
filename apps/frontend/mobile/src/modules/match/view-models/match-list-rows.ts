import type {
  DayMatchesResponse,
  PoolMatchesResponse,
} from "@/src/shared/generated/models";
import { formatMatchDateHeader } from "@/src/modules/match/view-models/match-date";

export type MatchDateRow = {
  type: "sectionHeader";
  title: string;
  sectionKey: string;
};

export type MatchPoolRow = {
  type: "pool";
  pool: PoolMatchesResponse;
  sectionKey: string;
};

export type MatchListRow = MatchDateRow | MatchPoolRow;

/**
 * Flattens the API day/pool hierarchy into the rows rendered by the match list.
 */
export function buildMatchListRows(
  dayMatches: readonly DayMatchesResponse[],
): MatchListRow[] {
  return dayMatches.flatMap((day) => {
    const sectionKey = String(day.date);

    return [
      {
        type: "sectionHeader",
        title: formatMatchDateHeader(day.date),
        sectionKey,
      },
      ...day.pools.map((pool) => ({
        type: "pool" as const,
        pool,
        sectionKey,
      })),
    ];
  });
}

/**
 * Returns a stable key for either a date header or a pool row.
 */
export function getMatchListRowKey(item: MatchListRow): string {
  if (item.type === "sectionHeader") {
    return `h-${item.sectionKey}`;
  }

  return `p-${item.pool.pool.id}-${item.sectionKey}`;
}
