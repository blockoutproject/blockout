import type {
  MatchDayResponse,
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";

/** Native list cells preserve server grouping while each encounter remains independently virtualized. */
export type CalendarRow =
  | { kind: "date"; key: string; date: string }
  | { kind: "space"; key: string }
  | {
      kind: "match";
      key: string;
      /** The date-local card may span several independently recycled match cells. */
      groupKey: string;
      match: MatchSummaryResponse;
      first: boolean;
      last: boolean;
    };

/**
 * Flattens already deduplicated complete days in their received order. Lateral dates occupy one
 * grid column beside the first match and its pool banner; spacers reserve that column for later cells.
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
      const groupKey = `${day.date}:${group.poolId.toLowerCase()}`;
      group.matches.forEach((match, index) => {
        if (!stacked && (poolIndex > 0 || index > 0)) {
          rows.push({ kind: "space", key: `space:${match.id}` });
        }
        rows.push({
          kind: "match",
          key: `match:${match.id}`,
          groupKey,
          match,
          first: index === 0,
          last: index === group.matches.length - 1,
        });
      });
    });
  }
  return rows;
}
