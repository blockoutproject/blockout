/** Projects published points and match-count aliases to their compact presentation labels. */
export function standingColumnLabel(column: string): string {
  switch (column) {
    case "Points":
      return "Pts";
    case "Jou.":
    case "Matchs / Joués":
      return "J";
    case "Gag.":
    case "Matchs / Gagnés":
      return "G";
    case "Per.":
    case "Matchs / Perdus":
      return "P";
    default:
      return column;
  }
}

/** Only an explicitly published points column occupies the points rail, independently of source order. */
export function standingPointsColumn(
  columns: readonly string[],
): string | undefined {
  return columns.find((column) => standingColumnLabel(column) === "Pts");
}

/** Selects display columns only; original column keys, values and query data remain untouched. */
export function standingVisibleColumns(columns: readonly string[]): string[] {
  return columns.filter((column) =>
    ["Pts", "J", "G", "P"].includes(standingColumnLabel(column)),
  );
}
