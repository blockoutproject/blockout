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
 * Observes text searches without copying their pages or cursor.
 * Clubs keeps its observer while inactive: tab return reuses a successful result or the
 * failed continuation, whose next attempt is explicit. New criteria still change the
 * native key and cancel an obsolete signal-consuming read. Other tabs retain their adoption scope.
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
    subscribed: resource === "club" || active,
    enabled:
      resource === "club"
        ? (query) =>
            active &&
            options.enabled !== false &&
            query.state.status !== "error"
        : options.enabled,
    staleTime: resource === "club" ? Infinity : undefined,
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
