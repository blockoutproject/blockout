import type {
  SubmitSupportRequest,
  SupportContextRequest,
} from "../../../../.generated/schemas/index.zod";
import type { SupportValues } from "../schemas/support-schema";

/** Converts validated editing values once; no classification means an absent property on the wire. */
export function toSupportRequest(
  values: SupportValues,
  context: SupportContextRequest,
): SubmitSupportRequest {
  return {
    kind: values.kind,
    title: values.title,
    description: values.description,
    replyEmail: values.replyEmail,
    ...(values.subject ? { subject: values.subject } : {}),
    context,
  };
}
