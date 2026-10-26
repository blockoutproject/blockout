import { z } from "zod";
import { completedYearsSchema } from "../age-declaration";

/** No default age is consent: an explicit valid selection is required before persistence. */
export const ageSchema = z.object({
  age: completedYearsSchema.nullable().refine((age) => age !== null),
});
/** The unconfirmed form starts without an age. */
export type AgeValues = z.input<typeof ageSchema>;
/** Validation narrows the explicit selection before the owner stores only its category and day. */
export type AgeSubmission = z.output<typeof ageSchema>;
