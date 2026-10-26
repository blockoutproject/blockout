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

/** The inline editor owns only the candidate URL; qualification remains a server projection. */
export const sourceCandidateSchema = z.object({
  candidateUrl: candidateUrlSchema,
});
/** RHF values for an existing source candidate. */
export type SourceCandidateValues = z.infer<typeof sourceCandidateSchema>;
