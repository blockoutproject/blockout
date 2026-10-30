import {
  hashKey,
  infiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import { useAuth0 } from "react-native-auth0";
import {
  createStreamContribution,
  updateOwnStreamContribution,
  listOwnStreamContributions,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import { OwnStreamContributionDetailResponse } from "../../../../.generated/schemas/index.zod";
import type {
  AccountResponse,
  CreateStreamContributionRequest,
  OwnStreamContributionsResponse,
  UpdateOwnStreamContributionRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useCommand } from "../../../shared/query/use-command";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import {
  useAccountSession,
  useCurrentAccount,
  type AccountSession,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
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
  session: AccountSession,
  queryKey: QueryKey,
  error: unknown,
  reading = false,
) {
  if (
    !session.isCurrent(session.generation) ||
    !isOwnContributionAccessDenied(error)
  )
    return;
  if (!reading) await client.cancelQueries({ queryKey, exact: true });
  if (!session.isCurrent(session.generation)) return;
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
  const auth = useAuth0();
  const client = useQueryClient();
  const actor = { ...session, accountId: session.accountId ?? "" };
  const queryKey = [
    ...contributionKeys.own(actor, matchId),
    admission.bypass?.intentId ?? "ordinary",
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
        void refuseOwnAccess(client, session, personal.queryKey, error);
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
  }, [client, session, ownHash, matchHash]);
  const currentKey = getSessionQueryKey(
    session.generation,
    getGetMyAccountQueryKey(),
  );
  const canRetain =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.data?.accountId === actor.accountId &&
    !isOwnContributionAccessDenied(profile.error);
  const usable = canRetain && profile.isSuccess;

  /** Rechecks the real profile cache before and after credential retrieval; enabled alone grants no authority. */
  function assertCurrent(command = false) {
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const current = client.getQueryState<AccountResponse>(currentKey);
    if (
      !admission.admitted ||
      current?.data?.accountId !== actor.accountId ||
      !actor.accountId
    )
      throw new ApiError("http", 403);
    if (current.status !== "success")
      throw current.error ?? new ApiError("cancelled");
    if (command && client.getQueryState(queryKey)?.status !== "success")
      throw new ApiError("cancelled");
  }
  /** Applies the captured F12 intent only after fresh native credentials and original-owner checks. */
  async function request(signal?: AbortSignal, command = false) {
    assertCurrent(command);
    const credentials = await auth.getCredentials();
    assertCurrent(command);
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
      signal,
      session,
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
          await refuseOwnAccess(client, session, queryKey, error, true);
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
    refuseAccess: (error: unknown) =>
      refuseOwnAccess(client, session, queryKey, error),
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
  /** Retains the exact acknowledgement and updates its known member/active projection; only a full read advances context revision or eligibility. */
  async function accept(
    accepted: OwnStreamContributionDetailResponse,
    updateMember = false,
  ) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!session.isCurrent(session.generation)) return;
    client.setQueryData(
      contributionKeys.ownVersion(actor, matchId, accepted.contribution.id),
      accepted,
    );
    client.setQueryData<InfiniteData<OwnStreamContributionsResponse>>(
      queryKey,
      (data) =>
        data
          ? {
              pages: data.pages.map((page) => ({
                ...page,
                ...(updateMember &&
                page.activeContribution?.id === accepted.contribution.id
                  ? {
                      activeContribution:
                        accepted.contribution.state === "active"
                          ? accepted.contribution
                          : undefined,
                    }
                  : {}),
                items: page.items.map((item) =>
                  updateMember && item.id === accepted.contribution.id
                    ? accepted.contribution
                    : item,
                ),
              })),
              pageParams: data.pageParams,
            }
          : data,
    );
    void client.invalidateQueries({
      queryKey,
      exact: true,
      refetchType: "none",
    });
    void readFirstPage().catch(() => undefined);
    void client.invalidateQueries({ queryKey: matchKey, exact: true });
  }
  const submit = useCommand(
    {
      mutationKey: contributionKeys.submit(actor, matchId),
      mutationFn: async (body: CreateStreamContributionRequest) =>
        createStreamContribution(actor.accountId, matchId, body, {
          ...(await request(undefined, true)),
          schema: OwnStreamContributionDetailResponse,
        }),
      onSuccess: (accepted) => accept(accepted),
    },
    {
      groupKey: contributionKeys.ownCommands(actor, matchId),
      requiresRead: requiresRevisionRead,
    },
  );

  const change = useCommand(
    {
      mutationKey: contributionKeys.updateOwn(actor, matchId),
      mutationFn: async ({ versionId, body }: OwnContributionChange) =>
        updateOwnStreamContribution(actor.accountId, matchId, versionId, body, {
          ...(await request(undefined, true)),
          schema: OwnStreamContributionDetailResponse,
        }),
      onSuccess: (accepted) => accept(accepted, true),
      onError: (error) => refuseAccess(error),
    },
    {
      groupKey: contributionKeys.ownCommands(actor, matchId),
      requiresRead: requiresRevisionRead,
    },
  );

  /** Refreshes only page zero after success; failure preserves every still-authorized page and command recovery. */
  function refresh() {
    if (submit.isPending()) return Promise.resolve(undefined);
    return readFirstPage();
  }
  /** Observes the current original collection once; never resends an address or drops authorized pages on failure. */
  function reread() {
    return submit.reconcile([queryKey], readFirstPage, () =>
      session.isCurrent(session.generation),
    );
  }
  return {
    query,
    submit,
    change,
    session,
    profile,
    usable,
    canRetain,
    refresh,
    reread,
  };
}
