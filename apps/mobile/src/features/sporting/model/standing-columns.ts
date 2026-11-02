/** Published match-count families use the approved compact labels; unknown columns remain verbatim. */
export function standingColumnLabel(column: string): string {
  switch (column) {
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
  return columns.find((column) => column === "Pts");
}
