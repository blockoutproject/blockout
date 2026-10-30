import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStreamReport,
  getOwnStreamReport,
} from "../../../../.generated/mobile";
import {
  StreamReportStateResponse,
  type CreateStreamReportRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useConsultationQueries } from "../../sporting/match-consultation";
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
    profile.isSuccess &&
    profile.data?.accountId === actor.accountId;
  /** Uses the existing generated transport with no publication eligibility or persistent reason payload. */
  async function request(signal?: AbortSignal) {
    const credentials = await session.getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
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
