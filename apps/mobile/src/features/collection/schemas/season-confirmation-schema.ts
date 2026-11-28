import { z } from "zod";

/** Typed confirmation preserves whitespace for exact comparison with its season. */
export const seasonConfirmationSchema = z.object({ confirmation: z.string() });

export type SeasonConfirmationValues = z.infer<typeof seasonConfirmationSchema>;
