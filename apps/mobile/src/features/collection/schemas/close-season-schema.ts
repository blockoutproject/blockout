import { z } from "zod";

/** Exact closure input preserves whitespace; the action checks both displayed and original season labels. */
export const closeSeasonSchema = z.object({ confirmation: z.string() });

/** RHF owns the typed label independently from the current season response. */
export type CloseSeasonValues = z.infer<typeof closeSeasonSchema>;
