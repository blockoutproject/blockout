import type { QueryClient } from "@tanstack/react-query";

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
