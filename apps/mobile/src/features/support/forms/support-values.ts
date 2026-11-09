import type { SupportContextRequest } from "../../../../.generated/schemas/index.zod";
import type { SupportValues } from "../schemas/support-schema";

/** Supplies an editable context-based classification and known contact without asserting ownership. */
export function supportValues(
  context: SupportContextRequest = {},
  replyEmail = "",
): SupportValues {
  let subject: SupportValues["subject"] = "";
  if (context.target) {
    subject = "sporting-data";
  } else if (context.screen === "Profil" || context.screen === "Connexion") {
    subject = "account";
  } else if (context.screen === "Pro") {
    subject = "pro-subscription";
  }
  return {
    images: [],
    kind: "problem",
    subject,
    title: "",
    description: "",
    replyEmail,
  };
}
