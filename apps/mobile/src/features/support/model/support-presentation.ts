import type { SupportValues } from "../schemas/support-schema";

/** French editing labels preserve canonical request kinds at the transport boundary. */
export const supportKindLabels: Record<SupportValues["kind"], string> = {
  problem: "Signaler un problème",
  suggestion: "Suggérer une amélioration",
};
/** Optional classification is editable; sporting-data also owns logo reports. */
export const supportSubjectLabels: Record<SupportValues["subject"], string> = {
  "": "Sans sujet",
  application: "comportement de l’application",
  "sporting-data": "données sportives",
  account: "compte et connexion",
  "pro-subscription": "abonnement Pro",
  "stream-links": "liens de diffusion",
  other: "autre",
};
