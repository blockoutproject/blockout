import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../shared/api/api-fetch";
import { useConsultationQueries } from "../../sporting/match-consultation";
import { uniqueSearchResults } from "../model/search-result";
import { createDiscoveryContext } from "./discovery-context";
import type {
  DiscoveryPage,
  DiscoveryExamplesRead,
  DiscoveryTextRead,
} from "./discovery-queries";
import {
  hashKey,
  isCancelledError,
  type InfiniteData,
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
 * Same-context F03 refusals newer than a page dispatch prune Query and cancel older in-flight work;
 * network failures retain permitted rows, and a later authoritative read may admit reappearance.
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
  const client = useQueryClient();
  const consultation = useConsultationQueries();
  const query = useInfiniteQuery({ ...options, subscribed: active });
  const detail = consultation[resource];
  useEffect(
    () =>
      client.getQueryCache().subscribe(async (event) => {
        if (event.type !== "updated") return;
        const state = client.getQueryState<InfiniteData<DiscoveryTextRead>>(
          options.queryKey,
        );
        if (!state?.data || isCancelledError(state.error)) return;
        const pages = state.data.pages;
        const detailKeys = uniqueSearchResults(pages).map((item) =>
          hashKey(detail(item.identity.id).queryKey),
        );
        if (
          event.query.queryHash !== hashKey(options.queryKey) &&
          !detailKeys.includes(event.query.queryHash)
        )
          return;
        const permitted = pages.map((page) =>
          withoutRefusedResults(client, page, detail),
        );
        if (permitted.every((page, index) => page === pages[index])) return;
        // Await native reversion before pruning so cancellation cannot replace success with a false append error.
        await client.cancelQueries({ queryKey: options.queryKey, exact: true });
        const current = client
          .getQueryCache()
          .find<InfiniteData<DiscoveryTextRead>>({
            queryKey: options.queryKey,
            exact: true,
          });
        const data = current?.state.data;
        if (!current || !data) return;
        const currentPages = data.pages.map((page) =>
          withoutRefusedResults(client, page, detail),
        );
        if (currentPages.every((page, index) => page === data.pages[index]))
          return;
        // This same-key update preserves native status, prior ordinary errors, cursor state and freshness.
        current.setState({ data: { ...data, pages: currentPages } });
      }),
    [client, options.queryKey, detail],
  );
  return {
    ...query,
    data: query.data && {
      ...query.data,
      pages: query.data.pages.map((page) =>
        withoutRefusedResults(client, page, detail),
      ),
    },
  };
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
    query.data ? [query.data.page] : undefined,
  ).map((item) => item.identity.id);
  const rejected = identities.filter((id) =>
    resourceRefused(
      client,
      consultation[resource](id).queryKey,
      query.data?.startedAt ?? Infinity,
    ),
  );
  const data =
    query.data && rejected.length
      ? withoutResults(query.data.page, rejected)
      : query.data?.page;

  useEffect(
    () =>
      client.getQueryCache().subscribe((event) => {
        if (event.type !== "updated") return;
        const state = client.getQueryState<DiscoveryExamplesRead>(
          options.queryKey,
        );
        if (!state?.data || isCancelledError(state.error)) return;
        const read = state.data;
        const currentIds = uniqueSearchResults([read.page]).map(
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
          resourceRefused(
            client,
            consultation[resource](id).queryKey,
            read.startedAt,
          ),
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
        client.setQueryData(next.queryKey, {
          ...read,
          page: withoutResults(read.page, removed),
        });
        if (state.status === "error" && ids.length > 0)
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

/** Removes current refusals using each page's dispatch time; historical detail errors cannot veto a later read. */
function withoutRefusedResults(
  client: QueryClient,
  page: DiscoveryTextRead,
  detail: (id: string) => { queryKey: QueryKey },
): DiscoveryTextRead {
  const removed = uniqueSearchResults([page])
    .filter((item) =>
      resourceRefused(
        client,
        detail(item.identity.id).queryKey,
        page.startedAt,
      ),
    )
    .map((item) => item.identity.id);
  return removed.length
    ? { ...withoutResults(page, removed), startedAt: page.startedAt }
    : page;
}

/** Removes only currently refused UUIDs, preserving the generated envelope, cursor and every other summary's order. */
function withoutResults(
  page: DiscoveryPage,
  ids: readonly string[],
): DiscoveryPage {
  if ("clubs" in page)
    return {
      ...page,
      clubs: page.clubs.filter((item) => !ids.includes(item.club.id)),
    };
  if ("teams" in page)
    return {
      ...page,
      teams: page.teams.filter((item) => !ids.includes(item.team.id)),
    };
  return {
    ...page,
    pools: page.pools.filter((item) => !ids.includes(item.pool.id)),
  };
}

/** Reads the existing F03 refusal for one exact session/admission/resource key without issuing a read. */
function resourceRefused(
  client: QueryClient,
  key: QueryKey,
  startedAt: number,
) {
  const state = client.getQueryState(key);
  const error = state?.error;
  return (
    state !== undefined &&
    error instanceof ApiError &&
    error.kind === "http" &&
    state.errorUpdatedAt >= startedAt &&
    [401, 403, 404].includes(error.status ?? 0)
  );
}
