import { z } from "zod";

/** Fictional required fields qualify ordinary validation without any business persistence. */
export const exampleSchema = z.object({
  name: z.string().trim().min(1, "Saisissez le nom du club."),
  last: z.string().trim().min(1, "Complétez le dernier champ."),
});
/** One qualification draft owned by RHF until its example unmounts. */
export type ExampleValues = z.infer<typeof exampleSchema>;
