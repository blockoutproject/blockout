import { getListDivisionsQueryKey } from "../../../../.generated/mobile";
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

/** Refreshes Mapping's pack list and detail; available source and season choices are unaffected. */
export function invalidateMappingReads(client: QueryClient) {
  void client.invalidateQueries({
    predicate: ({ queryKey: [path] }) =>
      typeof path === "string" &&
      /^\/administration\/packs(?:\/[\da-f-]+)?$/i.test(path),
  });
}

/** Refreshes catalogue variants without also fetching unrelated division details. */
export function invalidateDivisionCatalogue(client: QueryClient) {
  void client.invalidateQueries({ queryKey: getListDivisionsQueryKey() });
}
