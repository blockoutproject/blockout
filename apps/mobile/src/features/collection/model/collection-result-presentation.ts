import type {
  CollectionOutcomeEnum,
  CollectionResultResponse,
  CollectionStageEnum,
} from "../../../../.generated/schemas/index.zod";

export const outcomeLabels: Record<CollectionOutcomeEnum, string> = {
  success: "Réussie",
  partial: "Partielle",
  failed: "Échouée",
  unconfirmed: "Non confirmée",
};

export const stageLabels: Record<CollectionStageEnum, string> = {
  discovery: "Découverte",
  calendar: "Calendrier",
  details: "Détails",
  standings: "Classement",
  logo: "Logo",
  "club-sheet": "Fiche club",
  geocoding: "Géocodage",
};

/** A control's current result keeps the same identity across successive observations. */
export function collectionResultKey(result: CollectionResultResponse) {
  return `${result.scopeId}/${result.stage}/${result.phase}`;
}
