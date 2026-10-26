import type { DivisionSearchValues } from "../schemas/division-search-schema";

/** Starts or clears the local filter without changing the active/inactive catalogue tab. */
export function divisionSearchValues(): DivisionSearchValues {
  return { search: "" };
}
