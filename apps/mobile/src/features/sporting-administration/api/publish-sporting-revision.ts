import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Sporting revisions are opaque. Publish an accepted command only over its expected baseline or
 * its own revision; preserve a different revision admitted during the request and let the editor's
 * baseline comparison require an explicit reread. Callers cancel older reads and recheck the session first.
 */
export function publishSportingRevision<T extends { revision: string }>(
  client: QueryClient,
  key: QueryKey,
  accepted: T,
  expectedRevision: string,
) {
  client.setQueryData<T>(key, (current) =>
    !current ||
    current.revision === expectedRevision ||
    current.revision === accepted.revision
      ? accepted
      : current,
  );
}
