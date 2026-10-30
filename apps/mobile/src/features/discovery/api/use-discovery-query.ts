import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../shared/api/api-fetch";
import { useConsultationQueries } from "../../sporting/match-consultation";
import { uniqueSearchResults } from "../model/search-result";
import { createDiscoveryContext } from "./discovery-context";
import type { DiscoveryPage } from "./discovery-queries";
import {
  hashKey,
  isCancelledError,
  type QueryClient,
  type QueryKey,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import type { ListTeamsParams } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import type { DiscoveryResource } from "./discovery-context";
import {
  createSearchExamplesQueryOptions,
  createDiscoveryQueryOptions,
} from "./discovery-queries";

/**
 * Subscribes only the visible public text scene through the existing F05/F12 and F13 owners.
 * Native neighbour mounting starts no read; tab return keeps Query's no-refetch/no-retry-on-mount rules.
 */
export function useDiscoveryQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor" | "exampleIds">,
  active = true,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  const options = createDiscoveryQueryOptions(
    resource,
    input,
    session,
    admission,
    getCredentials,
  );
  return useInfiniteQuery({ ...options, subscribed: active });
}

/**
 * Retains only the example identity selection in visit memory; Query owns every summary and failure.
 * Key changes transfer the accepted response before observing the retained key, so no second request
 * is needed to record the initial selection. Changed filters create a new selection, even on reset.
 * Native cache notifications consume current F03 detail refusals without issuing detail reads or a registry.
 */
export function useSearchExamplesQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor" | "exampleIds">,
  active: boolean,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  const client = useQueryClient();
  const visit = useId();
  const context = hashKey(createDiscoveryContext(resource, input).queryKey);
  const [selection, setSelection] = useState<{
    context: string;
    revision: number;
    ids?: readonly string[];
  }>({ context, revision: 0 });
  if (selection.context !== context)
    setSelection({ context, revision: selection.revision + 1 });
  const options = createSearchExamplesQueryOptions(
    resource,
    input,
    selection.ids,
    `${visit}:${selection.revision}`,
    session,
    admission,
    getCredentials,
  );
  const query = useQuery({ ...options, enabled: active, subscribed: active });
  const consultation = useConsultationQueries();
  const identities = uniqueSearchResults(
    query.data ? [query.data] : undefined,
  ).map((item) => item.identity.id);
  const rejected = identities.filter((id) =>
    exampleRefused(client, consultation[resource](id).queryKey),
  );
  const data =
    query.data && rejected.length
      ? withoutExamples(query.data, rejected)
      : query.data;

  useEffect(
    () =>
      client.getQueryCache().subscribe((event) => {
        if (event.type !== "updated") return;
        const state = client.getQueryState<DiscoveryPage>(options.queryKey);
        if (!state?.data || isCancelledError(state.error)) return;
        const currentIds = uniqueSearchResults([state.data]).map(
          (item) => item.identity.id,
        );
        const detailKeys = currentIds.map((id) =>
          hashKey(consultation[resource](id).queryKey),
        );
        if (
          event.query.queryHash !== hashKey(options.queryKey) &&
          !detailKeys.includes(event.query.queryHash)
        )
          return;
        const removed = currentIds.filter((id) =>
          exampleRefused(client, consultation[resource](id).queryKey),
        );
        if (state.status !== "success" && !removed.length) return;
        const ids = currentIds.filter((id) => !removed.includes(id));
        if (JSON.stringify(selection.ids) === JSON.stringify(ids)) return;
        const next = createSearchExamplesQueryOptions(
          resource,
          input,
          ids,
          `${visit}:${selection.revision}`,
          session,
          admission,
          getCredentials,
        );
        // The accepted response moves with its bounded identity selection; no new request or second data store.
        void client.cancelQueries(
          { queryKey: options.queryKey, exact: true },
          { revert: false },
        );
        client.setQueryData(
          next.queryKey,
          withoutExamples(state.data, removed),
        );
        if (state.status === "error")
          client
            .getQueryCache()
            .find({ queryKey: next.queryKey, exact: true })
            ?.setState({ status: "error", error: state.error });
        setSelection({ ...selection, ids });
      }),
    [
      client,
      options.queryKey,
      consultation,
      resource,
      input,
      selection,
      visit,
      session,
      admission,
      getCredentials,
    ],
  );

  return { ...query, data };
}

/** Removes only currently refused UUIDs, preserving every other generated summary and its order. */
function withoutExamples(
  page: DiscoveryPage,
  ids: readonly string[],
): DiscoveryPage {
  if ("clubs" in page)
    return { clubs: page.clubs.filter((item) => !ids.includes(item.club.id)) };
  if ("teams" in page)
    return { teams: page.teams.filter((item) => !ids.includes(item.team.id)) };
  return { pools: page.pools.filter((item) => !ids.includes(item.pool.id)) };
}

/** Reads the existing F03 refusal for one exact session/admission/resource key without issuing a read. */
function exampleRefused(client: QueryClient, key: QueryKey) {
  const error = client.getQueryState(key)?.error;
  return (
    error instanceof ApiError &&
    error.kind === "http" &&
    [401, 403, 404].includes(error.status ?? 0)
  );
}
