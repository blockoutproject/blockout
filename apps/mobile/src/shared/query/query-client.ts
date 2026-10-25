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
 * Public keys are untouched. Private mutation records share the query namespace and cleanup boundary.
 * The owner supplies lifecycle notifications and generation validity.
 */
export function bindSessionQueries(
  client: QueryClient,
  subscribe: (listener: () => void) => () => void,
  isCurrent: (generation: string) => boolean,
) {
  /** Recognizes the same session namespace on private query and mutation keys. */
  function obsolete(key: readonly unknown[] | undefined) {
    return (
      key?.[0] === "session" && typeof key[1] === "string" && !isCurrent(key[1])
    );
  }

  /** Removes private reads and command records; mutation callbacks still guard their captured generation. */
  function removeObsoleteQueries() {
    const filters: QueryFilters = {
      predicate: ({ queryKey }) => obsolete(queryKey),
    };
    client.removeQueries(filters);
    const mutations = client.getMutationCache();
    mutations.getAll().forEach((mutation) => {
      if (obsolete(mutation.options.mutationKey)) mutations.remove(mutation);
    });
  }

  removeObsoleteQueries();
  return subscribe(removeObsoleteQueries);
}
