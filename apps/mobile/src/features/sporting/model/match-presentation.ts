import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";

/** Maps accepted result precision to the existing body statuses without inferring a live state. */
export function matchStatusLabel(match: MatchSummaryResponse): string {
  if (match.result?.state === "final") {
    return "Terminé";
  }
  if (match.result?.state === "provisional") {
    return "Score provisoire";
  }
  if (match.result?.state === "unconfirmed") {
    return "Résultat non confirmé";
  }
  return match.category === "completed" ? "Résultat indisponible" : "À venir";
}

/** Compact navigation preserves published final totals or exact nonnumeric notation; other results retain body status. */
export function matchHeaderLabel(match: MatchSummaryResponse): string {
  const result = match.result;
  if (result?.state !== "final") {
    return matchStatusLabel(match);
  }
  if (
    result.homeSets === undefined &&
    result.awaySets === undefined &&
    result.specialLabel
  ) {
    return result.specialLabel;
  }
  return `${result.homeSets ?? "-"} – ${result.awaySets ?? "-"}`;
}
