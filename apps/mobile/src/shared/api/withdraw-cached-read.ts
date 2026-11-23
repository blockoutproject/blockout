import type { Query } from "@tanstack/react-query";

/**
 * Clears retained data and publishes the refusal to the query's existing observers.
 * The caller selects the query and handles any request cancellation.
 */
export function withdrawCachedRead(query: Query, error: Error) {
  query.setState({
    data: undefined,
    dataUpdatedAt: 0,
    error,
    errorUpdatedAt: Date.now(),
    status: "error",
    fetchStatus: "idle",
  });
}
