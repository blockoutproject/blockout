import type { QueryFunctionContext } from "@tanstack/react-query";

/**
 * Drops refused data while leaving its active observer in place to handle the error.
 * QueryClient.setQueryData with undefined leaves the cached value intact.
 */
export function discardCachedRead({
  client,
  queryKey,
}: Pick<QueryFunctionContext, "client" | "queryKey">) {
  client
    .getQueryCache()
    .find({ queryKey, exact: true })
    ?.setState({ data: undefined, dataUpdatedAt: 0 });
}
