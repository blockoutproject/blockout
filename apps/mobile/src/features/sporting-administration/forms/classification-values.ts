import { z } from "zod";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";

/** Complete editing intent; null is represented by the explicit inherit/remove choice. */
export const classificationSchema = z
  .object({
    custom: z.boolean(),
    divisionId: z.string(),
    format: z.enum(["6x6", "4x4", "2x2"]),
    gender: z.enum(["female", "male", "mixed"]),
  })
  .superRefine((value, context) => {
    if (value.custom && !z.string().uuid().safeParse(value.divisionId).success)
      context.addIssue({
        code: "custom",
        path: ["divisionId"],
        message: "Choisissez une division active.",
      });
  });
/** RHF owns this complete editable snapshot, independently of server cache refreshes. */
export type ClassificationValues = z.infer<typeof classificationSchema>;
/** Seeds selectors from the setting or effective inheritance without creating an override. */
export function classificationValues(
  current: ClassificationDetailResponse,
): ClassificationValues {
  return {
    custom: current.setting !== null,
    divisionId: (current.setting ?? current.effective)?.divisionId ?? "",
    format: (current.setting ?? current.effective)?.format ?? "6x6",
    gender: (current.setting ?? current.effective)?.gender ?? "female",
  };
}
