import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ListTeamsParams } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "@/features/accounts/current-account";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import type { DiscoveryResource } from "./discovery-context";
import {
  createSearchExamplesQueryOptions,
  createDiscoveryQueryOptions,
} from "./discovery-queries";

/**
 * Observes text searches without copying their pages or cursor.
 * Each tab keeps its observer while inactive: tab return reuses a successful result or the
 * failed continuation, whose next attempt is explicit. New criteria still change the
 * native key and cancel an obsolete signal-consuming read.
 */
export function useDiscoveryQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor">,
  active = true,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const options = createDiscoveryQueryOptions(
    resource,
    input,
    session,
    admission,
    session.getCredentials,
  );
  return useInfiniteQuery({
    ...options,
    enabled: (query) =>
      active && options.enabled !== false && query.state.status !== "error",
    staleTime: Infinity,
  });
}

/**
 * Observes the visible empty-text context through ordinary Query retention and stale rereads.
 * Returning may display the same context's cached page while a successful current read replaces it.
 * Mounted observers retain explicit Retry across tab changes; changed keys keep native cancellation.
 */
export function useSearchExamplesQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor">,
  active: boolean,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const options = createSearchExamplesQueryOptions(
    resource,
    input,
    session,
    admission,
    session.getCredentials,
  );
  return useQuery({
    ...options,
    enabled: (query) => active && query.state.status !== "error",
  });
}
