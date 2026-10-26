import type { SourceBindingResponse } from "../../../../.generated/schemas/index.zod";
import type { SourceCandidateValues } from "../schemas/source-candidate-schema";

/** Seeds the explicit candidate draft without treating an absent value as accepted seasonal evidence. */
export function sourceCandidateValues(
  source: SourceBindingResponse,
): SourceCandidateValues {
  return { candidateUrl: source.candidateUrl ?? "" };
}
