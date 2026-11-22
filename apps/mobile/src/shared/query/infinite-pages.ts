import type { UseInfiniteQueryResult } from "@tanstack/react-query";

export function nextOffsetPage(
  last: Readonly<{ page: number; hasNext: boolean }>,
) {
  return last.hasNext ? last.page + 1 : undefined;
}

/** Overlapping pages keep the first position and most recent representation of each identity. */
export function uniquePageRows<Row>(
  rows: readonly Row[],
  key: (row: Row) => string,
) {
  return [...new Map(rows.map((row) => [key(row), row])).values()];
}

/** An eligible traversal shares one in-flight read between end-reached events and Retry. */
export function fetchNextPageIfReady(
  query: Pick<
    UseInfiniteQueryResult,
    "hasNextPage" | "isFetching" | "fetchNextPage"
  >,
  eligible: boolean,
) {
  if (eligible && query.hasNextPage && !query.isFetching) {
    void query.fetchNextPage({ cancelRefetch: false });
  }
}
