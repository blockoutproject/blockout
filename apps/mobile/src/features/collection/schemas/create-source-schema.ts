import { z } from "zod";
import { candidateUrlSchema } from "./source-candidate-schema";

/** Manual preparation supplies the expected native scope without defining scraping rules or seasonal evidence. */
export const createSourceSchema = z.object({
  organizerReference: z
    .string()
    .trim()
    .min(1, "Saisissez la référence officielle."),
  candidateUrl: candidateUrlSchema,
});

/** RHF values for a manually prepared expected scope and candidate. */
export type CreateSourceValues = z.infer<typeof createSourceSchema>;
