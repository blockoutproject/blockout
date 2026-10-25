import type { SetClassificationRequest } from "../../../../.generated/schemas/index.zod";
import type { ClassificationValues } from "../forms/classification-values";

/** Encodes the explicitly selected classification or null inheritance without deciding eligibility. */
export function toClassificationRequest(
  revision: string,
  values: ClassificationValues,
): SetClassificationRequest {
  return {
    revision,
    classification: values.custom
      ? {
          divisionId: values.divisionId,
          format: values.format,
          gender: values.gender,
        }
      : null,
  };
}
