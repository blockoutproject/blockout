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
  const { subject, ...fields } = values;
  return { ...fields, ...(subject ? { subject } : {}), context };
}
