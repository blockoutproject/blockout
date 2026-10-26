import type { SearchValues } from "../schemas/search-schema";

/** Starts and clears the instantaneous search without manufacturing a query. */
export function searchValues(): SearchValues {
  return { q: "" };
}
