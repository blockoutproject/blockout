import type {
  MatchDayResponse,
  MatchPoolGroupResponse,
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";

/** Native list cells preserve server grouping while each encounter remains independently virtualized. */
export type CalendarRow =
  | { kind: "date"; key: string; date: string }
  | { kind: "space"; key: string }
  | { kind: "pool"; key: string; group: MatchPoolGroupResponse }
  | {
      kind: "match";
      key: string;
      match: MatchSummaryResponse;
      first: boolean;
      last: boolean;
    };

/**
 * Flattens already deduplicated complete days in their received order. Lateral dates occupy one
 * grid column beside the first pool header; zero-height spacers reserve that column for later cells.
 * Enlarged text uses one column and full-width day headings without decorative spacers.
 */
export function calendarRows(
  days: readonly MatchDayResponse[],
  stacked: boolean,
): CalendarRow[] {
  const rows: CalendarRow[] = [];
  for (const day of days) {
    rows.push({ kind: "date", key: `date:${day.date}`, date: day.date });
    day.pools.forEach((group, poolIndex) => {
      const prefix = `${day.date}:${group.poolId}`;
      if (!stacked && poolIndex > 0)
        rows.push({ kind: "space", key: `${prefix}:space` });
      rows.push({ kind: "pool", key: `${prefix}:pool`, group });
      group.matches.forEach((match, index) => {
        if (!stacked) rows.push({ kind: "space", key: `space:${match.id}` });
        rows.push({
          kind: "match",
          key: `match:${match.id}`,
          match,
          first: index === 0,
          last: index === group.matches.length - 1,
        });
      });
    });
  }
  return rows;
}
