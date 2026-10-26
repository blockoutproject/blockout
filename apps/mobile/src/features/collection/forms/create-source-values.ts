import type { CreateSourceValues } from "../schemas/create-source-schema";

/** Starts a manual candidate without inventing a provider reference or qualified URL. */
export function createSourceValues(): CreateSourceValues {
  return { organizerReference: "", candidateUrl: "" };
}
