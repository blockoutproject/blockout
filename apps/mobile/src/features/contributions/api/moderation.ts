import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryFunctionContext,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  createModeratedStreamContribution,
  createStreamReactivation,
  getCreateModeratedStreamContributionMutationKey,
  getCreateStreamReactivationMutationKey,
  getUpdateModeratedStreamContributionMutationKey,
  getListModeratedStreamContributionsQueryKey,
  getListStreamModerationQueryKey,
  getListStreamReportsQueryKey,
  listModeratedStreamContributions,
  listStreamModeration,
  listStreamReports,
  updateModeratedStreamContribution,
} from "../../../../.generated/mobile";
import {
  ModeratedStreamContributionDetailResponse,
  type CreateModeratedStreamContributionRequest,
  CreateStreamReactivationRequest,
  ListStreamModerationParams,
  StreamVersionFilterEnum,
  UpdateModeratedStreamContributionRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useConsultationQueries } from "../../sporting/match-consultation";

/** Queue selection; native infinite-query page parameters own continuation. */
export type ModerationFilters = Omit<ListStreamModerationParams, "page">;

/** One captured exact version and its viewed original-actor command. */
export type ModerationChange = {
  versionId: string;
  body: UpdateModeratedStreamContributionRequest;
};
/** Reactivation targets a historical source rather than whichever version is now active. */
export type ModerationReactivation = {
  versionId: string;
  body: CreateStreamReactivationRequest;
};

/** F05/F12 supply the current literal capability, admission and captured-principal credentials. */
function useModerationAuthority() {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const allowed =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.data?.accountId === session.accountId &&
    !profile.isError &&
    profile.data.permissions?.moderateStreamLinks === true;
  const client = useQueryClient();
  // These are this feature's generated HTTP resources, not a cross-cache propagation registry.
  useEffect(() => {
    if (
      profile.isSuccess &&
      profile.data.permissions?.moderateStreamLinks !== true
    ) {
      client.removeQueries({
        predicate: (query) => isModerationResource(query.queryKey[0]),
      });
    }
  }, [client, profile.isSuccess, profile.data]);
  /** Captured native credentials refuse a different subject before private dispatch. */
  async function request(signal?: AbortSignal) {
    const credentials = await session.getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }
  return { allowed, session, profile, request };
}

/** Identifies only generated private video-moderation resources for known grant withdrawal. */
function isModerationResource(key: unknown) {
  return (
    typeof key === "string" &&
    (key === "/administration/stream-moderation" ||
      /^\/administration\/matches\/[^/]+\/stream-contributions(?:\/|$)/.test(
        key,
      ))
  );
}

/** Removes refused private content; ordinary transport outages retain authorized pages. */
function refuse(error: unknown, context: QueryFunctionContext): never {
  if (!context.signal.aborted && isAccessDenied(error)) {
    for (const query of context.client.getQueryCache().findAll({
      predicate: (query) => isModerationResource(query.queryKey[0]),
    })) {
      query.setState({ data: undefined, dataUpdatedAt: 0 });
    }
  }
  throw error;
}

/** Reads the private queue at entry and on explicit refresh with native Query paging/default recovery. */
export function useModerationQueue(filters: ModerationFilters) {
  const authority = useModerationAuthority();
  const client = useQueryClient();
  const options = infiniteQueryOptions({
    queryKey: getListStreamModerationQueryKey(filters),
    enabled: authority.allowed,
    gcTime: 0,
    refetchOnMount: "always" as const,
    refetchOnReconnect: false,
    initialPageParam: 0,
    queryFn: async (context) => {
      try {
        return await listStreamModeration(
          { ...filters, page: context.pageParam },
          await authority.request(context.signal),
        );
      } catch (error) {
        return refuse(error, context);
      }
    },
    getNextPageParam: (page) => page.nextPage,
  });
  const query = useInfiniteQuery(options);
  /** Replaces a traversal from page zero only after a successful native first-page fetch. */
  async function refresh() {
    await client.cancelQueries({ queryKey: options.queryKey, exact: true });
    return client.fetchInfiniteQuery({ ...options, staleTime: 0, pages: 1 });
  }
  return { ...authority, query, refresh };
}

/** Reads current match context/history and owns explicit non-retrying moderator mutations. */
export function useModerationMatch(
  matchId: string,
  state?: StreamVersionFilterEnum,
) {
  const authority = useModerationAuthority();
  const client = useQueryClient();
  const matchKey = useConsultationQueries().match(matchId).queryKey;
  const options = infiniteQueryOptions({
    queryKey: getListModeratedStreamContributionsQueryKey(
      matchId,
      state ? { state } : undefined,
    ),
    enabled: authority.allowed,
    gcTime: 0,
    refetchOnMount: "always" as const,
    refetchOnReconnect: false,
    initialPageParam: 0,
    queryFn: async (context) => {
      try {
        return await listModeratedStreamContributions(
          matchId,
          { state, page: context.pageParam },
          await authority.request(context.signal),
        );
      } catch (error) {
        return refuse(error, context);
      }
    },
    getNextPageParam: (page) => page.nextPage,
  });
  const query = useInfiniteQuery(options);
  /** Invalidates original private traversals and public F03 composition without rejecting an acknowledged mutation. */
  function settled(data: unknown, error: unknown) {
    if (isAccessDenied(error))
      client.removeQueries({
        predicate: (query) => isModerationResource(query.queryKey[0]),
      });
    for (const queryKey of [
      getListStreamModerationQueryKey(),
      getListModeratedStreamContributionsQueryKey(matchId),
    ]) {
      if (data !== undefined)
        client.setQueriesData<InfiniteData<unknown>>({ queryKey }, (current) =>
          current
            ? {
                ...current,
                pages: current.pages.slice(0, 1),
                pageParams: current.pageParams.slice(0, 1),
              }
            : current,
        );
      void client.invalidateQueries({ queryKey });
    }
    void client.invalidateQueries({ queryKey: matchKey, exact: true });
  }
  const publish = useMutation({
    mutationKey: [
      ...getCreateModeratedStreamContributionMutationKey(),
      matchId,
    ],
    retry: false,
    networkMode: "always",
    mutationFn: async (body: CreateModeratedStreamContributionRequest) =>
      createModeratedStreamContribution(matchId, body, {
        ...(await authority.request()),
        schema: ModeratedStreamContributionDetailResponse,
      }),
    onSettled: settled,
  });
  const change = useMutation({
    mutationKey: [
      ...getUpdateModeratedStreamContributionMutationKey(),
      matchId,
    ],
    retry: false,
    networkMode: "always",
    mutationFn: async ({ versionId, body }: ModerationChange) =>
      updateModeratedStreamContribution(
        matchId,
        versionId,
        body,
        await authority.request(),
      ),
    onSettled: settled,
  });
  const reactivate = useMutation({
    mutationKey: [...getCreateStreamReactivationMutationKey(), matchId],
    retry: false,
    networkMode: "always",
    mutationFn: async ({ versionId, body }: ModerationReactivation) =>
      createStreamReactivation(
        matchId,
        versionId,
        body,
        await authority.request(),
      ),
    onSettled: settled,
  });
  /** Refreshes the selected traversal from its first page; ordinary failure preserves its accepted data. */
  async function refresh() {
    await client.cancelQueries({ queryKey: options.queryKey, exact: true });
    return client.fetchInfiniteQuery({ ...options, staleTime: 0, pages: 1 });
  }
  return { ...authority, query, publish, change, reactivate, refresh };
}

/** Paged reports remain bound to one exact version, including a historical reactivation source. */
export function useModerationReports(
  matchId: string,
  versionId: string,
  enabled: boolean,
) {
  const authority = useModerationAuthority();
  return useInfiniteQuery({
    queryKey: getListStreamReportsQueryKey(matchId, versionId),
    enabled: authority.allowed && enabled,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    initialPageParam: 0,
    queryFn: async (context) => {
      try {
        return await listStreamReports(
          matchId,
          versionId,
          { page: context.pageParam },
          await authority.request(context.signal),
        );
      } catch (error) {
        return refuse(error, context);
      }
    },
    getNextPageParam: (page) => page.nextPage,
  });
}
