import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";

/** Wire examples from NotificationMessage.render(...).body(), exposed by NotificationApiMapper; no mobile editorial policy. */
export const notificationMessageSamples: [
  NotificationResponse["family"],
  string,
][] = [
  [
    "result",
    "Petit tour du terrain : le match Nantes – Tours. Score final : 3–1.",
  ],
  [
    "result",
    "On fait le point sur le match Nantes – Tours : Score final : 3–1.",
  ],
  [
    "result",
    "Côté tableau de bord : le match Nantes – Tours. Score final : 3–1.",
  ],
  [
    "result-with-link",
    "Retour côté terrain pour le match Nantes – Tours. Score final : 3–1. Un lien a été proposé pour ce match.",
  ],
  [
    "result-with-link",
    "Petit récap : le match Nantes – Tours. Score final : 3–1. Un lien a été proposé pour ce match.",
  ],
  [
    "result-with-link",
    "Un coup d’œil sur le match Nantes – Tours. Score final : 3–1. Un lien a été proposé pour ce match.",
  ],
  [
    "live-link",
    "Pour suivre le match Nantes – Tours : Un lien a été proposé pour ce match.",
  ],
  [
    "live-link",
    "On retrouve le match Nantes – Tours. Un lien a été proposé pour ce match.",
  ],
  [
    "live-link",
    "Petit passage côté terrain : le match Nantes – Tours. Un lien a été proposé pour ce match.",
  ],
  [
    "post-result-link",
    "Pour retrouver le match Nantes – Tours : Un lien a été proposé pour ce match.",
  ],
  [
    "post-result-link",
    "Un autre regard sur le match Nantes – Tours. Un lien a été proposé pour ce match.",
  ],
  [
    "post-result-link",
    "Un détour côté terrain : le match Nantes – Tours. Un lien a été proposé pour ce match.",
  ],
];
