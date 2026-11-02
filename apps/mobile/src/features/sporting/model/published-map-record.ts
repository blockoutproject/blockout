import type { PoolStandingsResponse } from "../../../../.generated/schemas/index.zod";

/** Exact published display values; only a complete coherent numeric record supplies bar weights. */
export interface PublishedMapRecord {
  played?: string;
  won?: string;
  lost?: string;
  proportion?: { won: number; lost: number };
}

/**
 * Projects one unambiguous team row and one evidenced literal column family. Unknown text remains
 * unknown or verbatim; this never joins by name, interprets sets/points as matches, or fills a count.
 */
export function publishedMapRecord(
  table: PoolStandingsResponse | undefined,
  teamId: string,
): PublishedMapRecord | undefined {
  if (table?.availability !== "available") return undefined;
  const rows = table.rows.filter((row) => row.team?.id === teamId);
  if (rows.length !== 1) return undefined;
  const families = [
    ["Jou.", "Gag.", "Per."],
    ["Matchs / Joués", "Matchs / Gagnés", "Matchs / Perdus"],
  ].filter((columns) =>
    columns.some((column) => table.columns.includes(column)),
  );
  if (families.length !== 1) return undefined;
  const values = families[0].map((column) => {
    const value = table.columns.includes(column)
      ? rows[0].statistics[column]
      : undefined;
    return value?.trim() ? value : undefined;
  });
  const [played, won, lost] = values;
  const [matches, wins, losses] = values.map((value) =>
    /^\d+$/.test(value ?? "") ? Number(value) : Number.NaN,
  );
  const proportion =
    [matches, wins, losses].every(Number.isSafeInteger) &&
    matches > 0 &&
    wins + losses === matches
      ? { won: wins, lost: losses }
      : undefined;
  return { played, won, lost, proportion };
}
