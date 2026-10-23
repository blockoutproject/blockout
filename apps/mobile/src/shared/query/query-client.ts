import {
  QueryClient,
  type QueryFilters,
  type QueryKey,
} from "@tanstack/react-query";

/**
 * Creates the root's in-memory cache with explicit business request recovery.
 * Offline attempts reach the bounded transport instead of waiting for reconnect.
 * Native defaults disable mutation retries and reconnect refetches in `always` mode.
 * Feature owners supply their approved refresh triggers and freshness/expiry rules.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: "always",
        retry: false,
        retryOnMount: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        networkMode: "always",
      },
    },
  });
}

/** Namespaces a generated private query key by the captured session, including same-account returns. */
export function getSessionQueryKey(generation: string, queryKey: QueryKey) {
  return ["session", generation, ...queryKey] as const;
}

/**
 * Connects the existing session owner to native Query cleanup; returns its unsubscribe function.
 * Public keys are untouched. The owner supplies lifecycle notifications and generation validity.
 */
export function bindSessionQueries(
  client: QueryClient,
  subscribe: (listener: () => void) => () => void,
  isCurrent: (generation: string) => boolean,
) {
  /** Cancels in-flight reads and removes cached values belonging to invalidated sessions. */
  function removeObsoleteQueries() {
    const filters: QueryFilters = {
      predicate: ({ queryKey }) =>
        queryKey[0] === "session" &&
        typeof queryKey[1] === "string" &&
        !isCurrent(queryKey[1]),
    };
    client.removeQueries(filters);
  }

  removeObsoleteQueries();
  return subscribe(removeObsoleteQueries);
}
