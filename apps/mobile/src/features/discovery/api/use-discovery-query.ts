import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ListTeamsParams } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import type { DiscoveryResource } from "./discovery-context";
import {
  createSearchExamplesQueryOptions,
  createDiscoveryQueryOptions,
} from "./discovery-queries";

/**
 * Observes the visible text context through native Query and its ordinary freshness policy.
 * A card-triggered read may retain its existing observer across tab changes until it settles.
 * Changed keys still cancel obsolete contexts through Query's consumed signal.
 */
export function useDiscoveryQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor">,
  active = true,
  retainExplicitRead = false,
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
    subscribed: active || retainExplicitRead,
  });
}

/**
 * Observes the visible empty-text context through ordinary Query retention and stale rereads.
 * Returning may display the same context's cached page while a successful current read replaces it.
 * Inactive contexts release their observer for ordinary cancellation and unused-cache collection.
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
  return useQuery({ ...options, subscribed: active });
}
