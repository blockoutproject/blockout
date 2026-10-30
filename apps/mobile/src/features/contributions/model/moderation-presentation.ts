import type {
  StreamContributionStateEnum,
  StreamDecisionEnum,
  StreamPlatformEnum,
} from "../../../../.generated/schemas/index.zod";

/** French states describe exact retained versions independently of color or sporting visibility. */
export const contributionStateLabels: Record<
  StreamContributionStateEnum,
  string
> = {
  active: "Publié",
  pending: "En attente de validation",
  rejected: "Refusé",
  cancelled: "Annulé",
  withdrawn: "Retiré",
  hidden: "Masqué après signalements",
  replaced: "Lien remplacé",
  superseded: "Proposition remplacée",
};
/** Useful decision copy preserves publication and later removal as separate facts. */
export const contributionDecisionLabels: Record<StreamDecisionEnum, string> = {
  publish: "Publication",
  approve: "Approbation",
  reject: "Refus",
  cancel: "Annulation",
  withdraw: "Retrait",
  hide: "Masquage après signalements",
  replace: "Remplacement",
  supersede: "Autre proposition retenue",
  reactivate: "Réactivation",
};
/** Provider names identify the address without asserting video availability. */
export const streamPlatformLabels: Record<StreamPlatformEnum, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  facebook: "Facebook",
};
/** Formats an accepted original time in the current native locale zone. */
export function moderationTime(at: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(at));
}
