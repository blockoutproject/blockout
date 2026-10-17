import { QueryClient } from "@tanstack/react-query";

/**
 * Creates the root's in-memory cache with explicit business request recovery.
 * Offline attempts reach the bounded transport instead of waiting for reconnect.
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
        refetchOnReconnect: false,
      },
      mutations: {
        networkMode: "always",
        retry: false,
      },
    },
  });
}
