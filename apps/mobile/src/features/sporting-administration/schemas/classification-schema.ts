import { z } from "zod";
import {
  SportFormatEnum,
  SportGenderEnum,
} from "../../../../.generated/schemas/index.zod";

/** Complete editing intent; null is represented by the explicit inherit/remove choice. */
export const classificationSchema = z
  .object({
    custom: z.boolean(),
    divisionId: z.string(),
    format: SportFormatEnum,
    gender: SportGenderEnum,
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
