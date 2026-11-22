import { z } from "zod";
import {
  SportFormatEnum,
  SportGenderEnum,
} from "../../../../.generated/schemas/index.zod";

/** Custom settings require a division. Pool inheritance clears the override. */
export const classificationSchema = z
  .object({
    custom: z.boolean(),
    divisionId: z.string(),
    format: SportFormatEnum,
    gender: SportGenderEnum,
  })
  .superRefine((value, context) => {
    if (
      value.custom &&
      !z.string().uuid().safeParse(value.divisionId).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["divisionId"],
        message: "Choisissez une division active.",
      });
    }
  });

/** RHF owns this complete editable snapshot, independently of server cache refreshes. */
export type ClassificationValues = z.infer<typeof classificationSchema>;
