import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Numeric collection revisions are monotone. A delayed accepted command must not replace an equal
 * or newer projection already read. Callers cancel older reads and recheck session ownership first;
 * they still return the actual command response so editors detect a newer cached baseline explicitly.
 */
export function publishCollectionRevision<T extends { revision: number }>(
  client: QueryClient,
  key: QueryKey,
  accepted: T,
) {
  client.setQueryData<T>(key, (current) =>
    current && current.revision >= accepted.revision ? current : accepted,
  );
}
