import type { SupportContextRequest } from "../../../../.generated/schemas/index.zod";
import type { SupportValues } from "../schemas/support-schema";

/** Supplies an editable context-based classification and known contact without asserting ownership. */
export function supportValues(
  context: SupportContextRequest = {},
  replyEmail = "",
): SupportValues {
  return {
    images: [],
    kind: "problem",
    subject: context.target
      ? "sporting-data"
      : context.screen === "Profil" || context.screen === "Connexion"
        ? "account"
        : context.screen === "Pro"
          ? "pro-subscription"
          : "",
    title: "",
    description: "",
    replyEmail,
  };
}
