import { z } from "zod";

/** Local catalogue search accepts the complete draft without adding server-search limits. */
export const divisionSearchSchema = z.object({ search: z.string() });

/** Exact user input; normalization belongs only to the local matching projection. */
export type DivisionSearchValues = z.infer<typeof divisionSearchSchema>;
