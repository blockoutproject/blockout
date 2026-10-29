import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
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
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useCommand } from "../../../shared/query/use-command";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { useConsultationQueries } from "../../sporting/match-consultation";
import { contributionKeys } from "./contribution-keys";

/** Shares the authoritative original-account eligibility read between the match entry and its form. */
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
  const currentKey = getSessionQueryKey(
    session.generation,
    getGetMyAccountQueryKey(),
  );
  const usable =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.isSuccess &&
    profile.data.accountId === actor.accountId;

  /** Rechecks the real profile cache before and after credential retrieval; enabled alone grants no authority. */
  function assertCurrent(command = false) {
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const current = client.getQueryState<AccountResponse>(currentKey);
    if (
      !admission.admitted ||
      current?.status !== "success" ||
      current.data?.accountId !== actor.accountId ||
      !actor.accountId
    )
      throw new ApiError("http", 403);
    if (command && client.getQueryState(queryKey)?.status !== "success")
      throw new ApiError("http", 403);
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
  const query = useInfiniteQuery({
    queryKey,
    enabled: usable && enabled,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    initialPageParam: 0,
    queryFn: async ({ signal, pageParam }) =>
      listOwnStreamContributions(
        actor.accountId,
        matchId,
        { page: pageParam },
        await request(signal),
      ),
    getNextPageParam: (page) => page.nextPage,
  });
  return { query, queryKey, actor, request, session, profile, usable };
}

/** Selected member and viewed revision remain together through native confirmation and dispatch. */
export interface OwnContributionChange {
  versionId: string;
  body: UpdateOwnStreamContributionRequest;
}

/** Current original-account reads and guarded commands; Query owns all request and recovery state. */
export function useOwnContributions(matchId: string) {
  const { query, queryKey, actor, request, session, profile, usable } =
    useOwnContributionsRead(matchId);
  const client = useQueryClient();
  const matchKey = useConsultationQueries().match(matchId).queryKey;
  /** Retains the exact acknowledgement and optionally updates its existing row; only a full read advances context revision or eligibility. */
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
              pages: data.pages.slice(0, 1).map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  updateMember && item.id === accepted.contribution.id
                    ? accepted.contribution
                    : item,
                ),
              })),
              pageParams: data.pageParams.slice(0, 1),
            }
          : data,
    );
    void client.invalidateQueries({ queryKey, exact: true });
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
    },
    {
      groupKey: contributionKeys.ownCommands(actor, matchId),
      requiresRead: requiresRevisionRead,
    },
  );

  /** Refreshes only page zero; a failed refresh preserves the draft and does not release unresolved commands. */
  function refresh() {
    if (submit.isPending()) return Promise.resolve(undefined);
    client.setQueryData<InfiniteData<OwnStreamContributionsResponse>>(
      queryKey,
      (data) =>
        data
          ? {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
          : data,
    );
    return query.refetch({ cancelRefetch: false });
  }
  /** Observes the current original collection once; never resends the user's address. */
  function reread() {
    client.setQueryData<InfiniteData<OwnStreamContributionsResponse>>(
      queryKey,
      (data) =>
        data
          ? {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
          : data,
    );
    return submit.reconcile(
      [queryKey],
      () => query.refetch(),
      (result) =>
        session.isCurrent(session.generation) &&
        !result.isError &&
        !!result.data,
    );
  }
  return { query, submit, change, session, profile, usable, refresh, reread };
}
