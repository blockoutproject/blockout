import {
  hashKey,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

/** Refreshes existing sporting projections after confirmed classification, lifecycle or division-presentation changes. */
export function invalidateSportingReads(client: QueryClient) {
  void client.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey.some(
        (part) =>
          typeof part === "string" &&
          /^\/(clubs|teams|pools|matches|divisions)(\/|$)/.test(part),
      ),
  });
}

/** Classification changes affect inherited settings while preserving an accepted target response. */
export function invalidateClassificationReads(
  client: QueryClient,
  retainedKey?: QueryKey,
) {
  void client.invalidateQueries({
    predicate: ({ queryKey }) =>
      (!retainedKey || hashKey(queryKey) !== hashKey(retainedKey)) &&
      queryKey.some(
        (part) => typeof part === "string" && part.includes("/classification"),
      ),
  });
}

/** Division creation, presentation and activity share the complete administration projections. */
export function invalidateDivisionReads(
  client: QueryClient,
  retainedKey?: QueryKey,
) {
  void client.invalidateQueries({
    predicate: ({ queryKey }) =>
      (!retainedKey || hashKey(queryKey) !== hashKey(retainedKey)) &&
      queryKey.some(
        (part) =>
          typeof part === "string" &&
          part.startsWith("/administration/divisions"),
      ),
  });
}
