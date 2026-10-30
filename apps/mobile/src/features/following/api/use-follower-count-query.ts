import { removeUnavailableFollowTarget } from "../lists";
import { useQuery } from "@tanstack/react-query";
import {
  getTeamFollowerCount,
  getPoolFollowerCount,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useSportingTargetAvailability } from "../../sporting/availability";
import { restrictFollowTarget, isFollowRestriction } from "./follow-mutations";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  followerCountKey,
  captureFollowingOwner,
  type FollowingTarget,
} from "./following-keys";

/**
 * Reads only the generated public count. Ordinary access needs no profile, credentials or Pro;
 * explicit F12 bypass retains its captured original session and current grant checks.
 */
export function useFollowerCountQuery(target: FollowingTarget) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = session;
  const owner = admission.bypass ? captureFollowingOwner(session) : null;
  const rejectTarget = useSportingTargetAvailability();
  return useQuery({
    queryKey: followerCountKey(target, owner ?? undefined),
    enabled: admission.admitted && (!admission.bypass || owner !== null),
    refetchOnMount: "always",
    retryOnMount: true,
    queryFn: async (context) => {
      const { signal, client, queryKey } = context;
      try {
        let headers: Record<string, string> | undefined;
        if (admission.bypass) {
          const credentials = await getCredentials();
          if (!credentials?.accessToken) throw new ApiError("http", 401);
          headers = { Authorization: `Bearer ${credentials.accessToken}` };
        }
        const options = admission.request({
          signal,
          headers,
        });
        return await (target.type === "team"
          ? getTeamFollowerCount(target.id, options)
          : getPoolFollowerCount(target.id, options));
      } catch (error) {
        if (
          !signal.aborted &&
          (isAccessDenied(error) || isFollowRestriction(error))
        ) {
          if (error instanceof ApiError && error.status === 404) {
            const account = client.getQueryData<AccountResponse>(
              getGetMyAccountQueryKey(),
            );
            const original = captureFollowingOwner({
              ...session,
              accountId: account?.accountId ?? session.accountId,
            });
            if (original) {
              await restrictFollowTarget(client, original, target, error);
              await removeUnavailableFollowTarget(
                client,
                original,
                Boolean(admission.bypass),
                target,
              );
            }
            await rejectTarget(context, target.type, target.id, error);
          }
          // Withdrawal may unmount this counter and cancel its read; clear after native reversion.
          // A later network error must not resurrect a count whose current read was refused.
          client.getQueryCache().find({ queryKey, exact: true })?.setState({
            data: undefined,
            dataUpdatedAt: 0,
          });
        }
        throw error;
      }
    },
  });
}
