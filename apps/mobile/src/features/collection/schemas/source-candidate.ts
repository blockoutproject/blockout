import { z } from "zod";

/** Editing accepts credential-free HTTP candidates; the collector alone qualifies official hosts and formats. */
export const candidateUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Saisissez une URL HTTP ou HTTPS sans identifiant.");

/** Manual preparation supplies the expected native scope without defining scraping rules or seasonal evidence. */
export const createSourceSchema = z.object({
  organizerReference: z
    .string()
    .trim()
    .min(1, "Saisissez la référence officielle."),
  candidateUrl: candidateUrlSchema,
});
