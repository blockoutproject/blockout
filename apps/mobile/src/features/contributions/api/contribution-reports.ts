import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStreamReport,
  getOwnStreamReport,
} from "../../../../.generated/mobile";
import {
  StreamReportStateResponse,
  type CreateStreamReportRequest,
} from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "@/shared/api/access-denied";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import {
  useAccountSession,
  useCurrentAccount,
} from "@/features/accounts/current-account";
import { useConsultationQueries } from "@/features/sporting/match-consultation";
import { contributionKeys } from "./contribution-keys";

/** Original-account report state and explicit reason-only writes; exact-version deduplication makes a later manual retry safe without a recovery state. */
export function useContributionReport(matchId: string, contributionId: string) {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const client = useQueryClient();
  const match = useConsultationQueries().match(matchId);
  const actor = { ...session, accountId: session.accountId ?? "" };
  const queryKey = [
    ...contributionKeys.ownReport(actor, contributionId),
    admission.bypass?.accountId ?? "ordinary",
  ];
  const usable =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.data?.accountId === actor.accountId;

  /** Uses the existing generated transport with no publication eligibility or persistent reason payload. */
  async function request(signal?: AbortSignal) {
    const credentials = await session.getCredentials();
    return admission.request({
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }

  /** A refusal withdraws private report authority; later technical failures retain null rather than the former grant. */
  function withdrawRefusedState(error: unknown) {
    if (isAccessDenied(error)) {
      client.setQueryData<StreamReportStateResponse | null>(queryKey, null, {
        updatedAt: client.getQueryState(queryKey)?.dataUpdatedAt ?? 0,
      });
    }
  }

  const query = useQuery<StreamReportStateResponse | null>({
    queryKey,
    enabled: usable,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      try {
        return await getOwnStreamReport(
          actor.accountId,
          contributionId,
          await request(signal),
        );
      } catch (error) {
        if (!signal.aborted) {
          withdrawRefusedState(error);
        }
        throw error;
      }
    },
  });
  const mutationKey = contributionKeys.report(actor, contributionId);
  const command = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey,
    mutationFn: async (body: CreateStreamReportRequest) =>
      createStreamReport(actor.accountId, contributionId, body, {
        ...(await request()),
        schema: StreamReportStateResponse,
      }),
    onError: withdrawRefusedState,
    onSettled: () => {
      void client.invalidateQueries({ queryKey, exact: true });
      void client.invalidateQueries({
        queryKey: contributionKeys.own(actor, matchId),
      });
      void client.invalidateQueries({ queryKey: match.queryKey, exact: true });
    },
  });
  return { session, profile, usable, query, command };
}
