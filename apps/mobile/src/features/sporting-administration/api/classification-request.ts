import type { SetClassificationRequest } from "../../../../.generated/schemas/index.zod";
import type { ClassificationValues } from "../schemas/classification-schema";

/** Encodes the explicitly selected classification or null inheritance without deciding eligibility. */
export function toClassificationRequest(
  values: ClassificationValues,
): SetClassificationRequest {
  return {
    classification: values.custom
      ? {
          divisionId: values.divisionId,
          format: values.format,
          gender: values.gender,
        }
      : null,
  };
}
