import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  listClubs,
  listTeams,
  listPools,
  getSportingSearchOptions,
  getGetSportingSearchOptionsQueryKey,
} from "../../../../.generated/mobile";
import type {
  ListTeamsParams,
  SearchResourceTypeEnum,
  ClubSearchResponse,
  TeamSearchResponse,
  PoolSearchResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import type { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  createDiscoveryContext,
  type DiscoveryResource,
} from "./discovery-context";

/** Generated collection envelopes retain their resource-specific summaries and optional cursor. */
export type DiscoveryPage =
  ClubSearchResponse | TeamSearchResponse | PoolSearchResponse;

/** Captured F05 generation guards public completions without waiting for account resolution. */
type DiscoverySession = NonNullable<ApiFetchOptions["session"]>;

/** F12 remains the only owner of current ordinary admission and deliberate bypass intent. */
type DiscoveryAdmission = Pick<
  ReturnType<typeof useOrdinaryRequest>,
  "request" | "bypass"
>;

/**
 * Builds one textual infinite-query entry for type, normalized text, filters and captured access/session.
 * Empty text never executes a textual read. Cursor state belongs only to
 * pageParam. Every execution prepares fresh F12 options after any bypass credentials; generated
 * transport validates once and rejects cancelled/obsolete completions. No ordinary work is replayed.
 */
export function createDiscoveryQueryOptions(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor" | "exampleIds">,
  session: DiscoverySession,
  admission: DiscoveryAdmission,
  getCredentials: () => Promise<{ accessToken: string } | undefined>,
) {
  const context = createDiscoveryContext(resource, input);
  const intent = admission.bypass;
  return infiniteQueryOptions({
    queryKey: intent
      ? getSessionQueryKey(session.generation, [
          "discovery-bypass",
          intent.accountId,
          intent.intentId,
          ...context.queryKey,
        ])
      : ["discovery", session.generation, ...context.queryKey],
    enabled:
      context.params.q !== undefined &&
      /[^\p{White_Space}]/u.test(context.params.q),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({
      signal,
      pageParam,
      client,
      queryKey,
    }): Promise<DiscoveryPage> => {
      try {
        let headers: Record<string, string> | undefined;
        if (intent) {
          const credentials = await getCredentials();
          if (!credentials?.accessToken) throw new ApiError("http", 401);
          headers = { Authorization: `Bearer ${credentials.accessToken}` };
        }
        const options = admission.request({ session, signal, headers });
        const params = { ...context.params, cursor: pageParam };
        if (resource === "club") return await listClubs(params, options);
        if (resource === "team") return await listTeams(params, options);
        return await listPools(params, options);
      } catch (error) {
        // An access or visibility refusal invalidates previously authorized pages without resetting the request lifecycle.
        if (
          !signal.aborted &&
          error instanceof ApiError &&
          error.kind === "http" &&
          (error.status === 401 || error.status === 403 || error.status === 404)
        ) {
          client
            .getQueryCache()
            .find({ queryKey, exact: true })
            ?.setState({ data: undefined, dataUpdatedAt: 0 });
        }
        throw error;
      }
    },
    getNextPageParam: (page) => page.nextCursor,
  });
}

/** Current choices have their own generated key and captured admission, independently of search text. */
export function createSearchOptionsQueryOptions(
  resourceType: SearchResourceTypeEnum,
  session: DiscoverySession,
  admission: DiscoveryAdmission,
  getCredentials: () => Promise<{ accessToken: string } | undefined>,
) {
  const intent = admission.bypass;
  const generatedKey = getGetSportingSearchOptionsQueryKey({ resourceType });
  return queryOptions({
    queryKey: intent
      ? getSessionQueryKey(session.generation, [
          "discovery-options-bypass",
          intent.accountId,
          intent.intentId,
          ...generatedKey,
        ])
      : ["discovery-options", session.generation, ...generatedKey],
    // Entering a new visit reads current choices before selecting its default; sheets retain this observer.
    refetchOnMount: "always",
    // A new visit also rereads a failed initial catalogue; no retry is scheduled within a visit.
    retryOnMount: true,
    queryFn: async ({ signal }) => {
      let headers: Record<string, string> | undefined;
      if (intent) {
        const credentials = await getCredentials();
        if (!credentials?.accessToken) throw new ApiError("http", 401);
        headers = { Authorization: `Bearer ${credentials.accessToken}` };
      }
      return getSportingSearchOptions(
        { resourceType },
        admission.request({ session, signal, headers }),
      );
    },
  });
}
