import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  createStreamReport,
  getOwnStreamReport,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import {
  StreamReportStateResponse,
  type AccountResponse,
  type CreateStreamReportRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useCommand } from "../../../shared/query/use-command";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { useConsultationQueries } from "../../sporting/match-consultation";
import { contributionKeys } from "./contribution-keys";

/** Original-account report state and explicit reason-only writes on one captured version. */
export function useContributionReport(matchId: string, contributionId: string) {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const auth = useAuth0();
  const client = useQueryClient();
  const match = useConsultationQueries().match(matchId);
  const actor = { ...session, accountId: session.accountId ?? "" };
  const queryKey = [
    ...contributionKeys.ownReport(actor, contributionId),
    admission.bypass?.intentId ?? "ordinary",
  ];
  const profileKey = getSessionQueryKey(
    session.generation,
    getGetMyAccountQueryKey(),
  );
  const usable =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.isSuccess &&
    profile.data?.accountId === actor.accountId;

  /** Rechecks current original identity and ordinary admission on both sides of native credential retrieval. */
  function assertCurrent() {
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const current = client.getQueryState<AccountResponse>(profileKey);
    if (
      !admission.admitted ||
      !actor.accountId ||
      current?.data?.accountId !== actor.accountId
    )
      throw new ApiError("http", 403);
    if (current.status !== "success")
      throw current.error ?? new ApiError("cancelled");
  }
  /** Uses the existing generated transport with no publication eligibility or persistent reason payload. */
  async function request(signal?: AbortSignal) {
    assertCurrent();
    const credentials = await auth.getCredentials();
    assertCurrent();
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
      session,
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }
  const query = useQuery({
    queryKey,
    enabled: usable,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    queryFn: async ({ signal }) =>
      getOwnStreamReport(
        actor.accountId,
        contributionId,
        await request(signal),
      ),
  });
  const groupKey = contributionKeys.report(actor, contributionId);
  const command = useCommand(
    {
      mutationKey: groupKey,
      mutationFn: async (body: CreateStreamReportRequest) =>
        createStreamReport(actor.accountId, contributionId, body, {
          ...(await request()),
          schema: StreamReportStateResponse,
        }),
      onSuccess: async (accepted) => {
        if (!session.isCurrent(session.generation)) return;
        await client.cancelQueries({ queryKey, exact: true });
        if (!session.isCurrent(session.generation)) return;
        client.setQueryData(queryKey, accepted);
        void client.invalidateQueries({
          queryKey: contributionKeys.own(actor, matchId),
          refetchType: "none",
        });
        void client.invalidateQueries({
          queryKey: match.queryKey,
          exact: true,
        });
      },
    },
    { groupKey, requiresRead: requiresRevisionRead },
  );
  return { session, profile, usable, query, command };
}
