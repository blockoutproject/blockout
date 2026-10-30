import {
  hashKey,
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import {
  createStreamContribution,
  listOwnStreamContributions,
  updateOwnStreamContribution,
} from "../../../../.generated/mobile";
import {
  type CreateStreamContributionRequest,
  type UpdateOwnStreamContributionRequest,
  OwnStreamContributionDetailResponse,
} from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { ApiError } from "../../../shared/api/api-fetch";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useConsultationQueries } from "../../sporting/match-consultation";
import { contributionKeys } from "./contribution-keys";

/** A current owner refusal or unavailable match revokes the personal resource, unlike a technical outage. */
export function isOwnContributionAccessDenied(
  error: unknown,
): error is ApiError {
  return (
    isAccessDenied(error) ||
    (error instanceof ApiError && error.kind === "http" && error.status === 404)
  );
}
/**
 * Applies a current resource refusal to native Query state; later technical failures cannot recover
 * revoked private data. A failing reader finishes its own transition and must not cancel itself.
 */
async function refuseOwnAccess(
  client: QueryClient,
  queryKey: QueryKey,
  error: unknown,
  reading = false,
) {
  if (!isOwnContributionAccessDenied(error)) return;
  if (!reading) await client.cancelQueries({ queryKey, exact: true });
  client.getQueryCache().find({ queryKey, exact: true })?.setState({
    data: undefined,
    dataUpdatedAt: 0,
    error,
    errorUpdatedAt: Date.now(),
    status: "error",
    fetchStatus: "idle",
  });
}
/** Shares original-account reads and revokes private data on public-match refusal, including while the entry is disabled. */
export function useOwnContributionsRead(matchId: string, enabled = true) {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const client = useQueryClient();
  const actor = { ...session, accountId: session.accountId ?? "" };
  const queryKey = [
    ...contributionKeys.own(actor, matchId),
    admission.bypass?.accountId ?? "ordinary",
  ];
  const ownHash = hashKey(queryKey);
  const matchHash = hashKey(useConsultationQueries().match(matchId).queryKey);
  useLayoutEffect(() => {
    const cache = client.getQueryCache();
    /** Revokes this original owner's cache before a later public mount can replace the refusal with loading. */
    function refuseMatch(error: unknown) {
      const personal = cache.get(ownHash);
      if (
        personal &&
        (personal.state.data !== undefined ||
          personal.state.fetchStatus === "fetching")
      )
        void refuseOwnAccess(client, personal.queryKey, error);
    }
    const unsubscribe = cache.subscribe((event) => {
      if (
        event.type === "updated" &&
        event.action.type === "error" &&
        event.query.queryHash === matchHash
      )
        refuseMatch(event.query.state.error);
    });
    refuseMatch(cache.get(matchHash)?.state.error);
    return unsubscribe;
  }, [client, ownHash, matchHash]);
  const canRetain =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.data?.accountId === actor.accountId &&
    !isOwnContributionAccessDenied(profile.error);
  const usable = canRetain && profile.isSuccess;
  /** Applies the captured F12 intent only after fresh native credentials and original-owner checks. */
  async function request(signal?: AbortSignal) {
    const credentials = await session.getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }
  const options = infiniteQueryOptions({
    queryKey,
    gcTime: 0,
    refetchOnMount: "always" as const,
    refetchOnReconnect: false,
    initialPageParam: 0,
    queryFn: async ({ signal, pageParam }) => {
      try {
        return await listOwnStreamContributions(
          actor.accountId,
          matchId,
          { page: pageParam },
          await request(signal),
        );
      } catch (error) {
        if (!signal.aborted)
          await refuseOwnAccess(client, queryKey, error, true);
        throw error;
      }
    },
    getNextPageParam: (page) => page.nextPage,
  });
  const query = useInfiniteQuery({ ...options, enabled: usable && enabled });
  /** Native Query replaces the traversal only after a successful first-page read, retaining all authorized pages on failure. */
  async function readFirstPage() {
    await client.cancelQueries({ queryKey, exact: true });
    return client.fetchInfiniteQuery({ ...options, staleTime: 0, pages: 1 });
  }
  return {
    query,
    queryKey,
    actor,
    request,
    session,
    profile,
    usable,
    canRetain,
    readFirstPage,
    refuseAccess: (error: unknown) => refuseOwnAccess(client, queryKey, error),
  };
}
/** Selected member and viewed revision remain together through native confirmation and dispatch. */
export interface OwnContributionChange {
  versionId: string;
  body: UpdateOwnStreamContributionRequest;
}
/** Current original-account reads and guarded commands; Query owns all request and recovery state. */
export function useOwnContributions(matchId: string) {
  const {
    query,
    queryKey,
    actor,
    request,
    session,
    profile,
    usable,
    canRetain,
    readFirstPage,
    refuseAccess,
  } = useOwnContributionsRead(matchId);
  const client = useQueryClient();
  const matchKey = useConsultationQueries().match(matchId).queryKey;
  /** Invalidates the owner context and public match after settlement. */
  function accept() {
    void client.invalidateQueries({ queryKey, exact: true });
    void client.invalidateQueries({ queryKey: matchKey, exact: true });
  }
  const submit = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: contributionKeys.submit(actor, matchId),
    mutationFn: async (body: CreateStreamContributionRequest) =>
      createStreamContribution(actor.accountId, matchId, body, {
        ...(await request()),
        schema: OwnStreamContributionDetailResponse,
      }),
    onSettled: accept,
    onError: (error) => refuseAccess(error),
  });
  const change = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: contributionKeys.updateOwn(actor, matchId),
    mutationFn: async ({ versionId, body }: OwnContributionChange) =>
      updateOwnStreamContribution(actor.accountId, matchId, versionId, body, {
        ...(await request()),
        schema: OwnStreamContributionDetailResponse,
      }),
    onSettled: accept,
    onError: (error) => refuseAccess(error),
  });
  return {
    query,
    submit,
    change,
    session,
    profile,
    usable,
    canRetain,
    refresh: readFirstPage,
  };
}
