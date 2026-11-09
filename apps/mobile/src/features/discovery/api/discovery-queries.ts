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
import type { SessionSnapshot } from "../../accounts/session/account-session-provider";
import type { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  createDiscoveryContext,
  type DiscoveryResource,
} from "./discovery-context";

/** Generated collection envelopes retain each resource's summaries and server cursor. */
export type DiscoveryPage =
  ClubSearchResponse | TeamSearchResponse | PoolSearchResponse;

/** Ordinary admission is public; explicit bypass captures the original native credential owner. */
type DiscoveryAdmission = Pick<
  ReturnType<typeof useOrdinaryRequest>,
  "request" | "bypass"
>;
type Credentials = () => Promise<{ accessToken: string } | undefined>;

/** Prepares only explicit bypass credentials, without a client session/refusal protocol. */
async function request(
  admission: DiscoveryAdmission,
  getCredentials: Credentials,
  signal: AbortSignal,
): Promise<ApiFetchOptions> {
  let headers: Record<string, string> | undefined;
  if (admission.bypass) {
    const credentials = await getCredentials();
    if (!credentials?.accessToken) {
      throw new ApiError("http", 401);
    }
    headers = { Authorization: `Bearer ${credentials.accessToken}` };
  }
  return admission.request({ signal, headers });
}

/** Native infinite pages use generated normalized selections; no detail-refusal timestamp graph edits them. */
export function createDiscoveryQueryOptions(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor">,
  session: SessionSnapshot,
  admission: DiscoveryAdmission,
  getCredentials: Credentials,
) {
  const context = createDiscoveryContext(resource, input);
  return infiniteQueryOptions({
    queryKey: admission.bypass
      ? [
          "discovery-bypass",
          session.subject,
          session.accountId,
          ...context.queryKey,
        ]
      : context.queryKey,
    enabled:
      context.params.q !== undefined &&
      /[^\p{White_Space}]/u.test(context.params.q),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam }): Promise<DiscoveryPage> => {
      const options = await request(admission, getCredentials, signal);
      const params = { ...context.params, cursor: pageParam };
      return readSearchPage(resource, params, options);
    },
    getNextPageParam: (page) => page.nextCursor,
  });
}

/** Each visit reads current generated choices independently of search text and Pro. */
export function createSearchOptionsQueryOptions(
  resourceType: SearchResourceTypeEnum,
  session: SessionSnapshot,
  admission: DiscoveryAdmission,
  getCredentials: Credentials,
) {
  const generated = getGetSportingSearchOptionsQueryKey({ resourceType });
  return queryOptions({
    queryKey: admission.bypass
      ? [
          "discovery-options-bypass",
          session.subject,
          session.accountId,
          ...generated,
        ]
      : generated,
    refetchOnMount: "always",
    retryOnMount: true,
    queryFn: async ({ signal }) =>
      getSportingSearchOptions(
        { resourceType },
        await request(admission, getCredentials, signal),
      ),
  });
}

/**
 * Reads deterministic current examples in one ordinary cache entry per resource/filter context.
 * Public and explicit bypass contexts stay separate; successful reads may replace cached identities.
 */
export function createSearchExamplesQueryOptions(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor">,
  session: SessionSnapshot,
  admission: DiscoveryAdmission,
  getCredentials: Credentials,
) {
  const context = createDiscoveryContext(resource, input);
  return queryOptions({
    queryKey: admission.bypass
      ? [
          "discovery-examples-bypass",
          session.subject,
          session.accountId,
          ...context.queryKey,
        ]
      : ["discovery-examples", ...context.queryKey],
    queryFn: async ({ signal }): Promise<DiscoveryPage> => {
      const options = await request(admission, getCredentials, signal);
      return readSearchPage(resource, context.params, options);
    },
  });
}

/** Uses the same generated resource reader for textual pages and cached examples. */
function readSearchPage(
  resource: DiscoveryResource,
  params: ListTeamsParams,
  options: ApiFetchOptions,
): Promise<DiscoveryPage> {
  switch (resource) {
    case "club":
      return listClubs(params, options);
    case "team":
      return listTeams(params, options);
    default:
      return listPools(params, options);
  }
}
