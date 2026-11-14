import { useQuery } from "@tanstack/react-query";
import {
  getTeamFollowerCount,
  getPoolFollowerCount,
} from "../../../../.generated/mobile";
import { ApiError } from "@/shared/api/api-fetch";
import { isAccessDenied } from "@/shared/api/access-denied";
import { useSportingTargetAvailability } from "@/features/sporting/availability";
import { isFollowRestriction } from "./follow-mutations";
import { useAccountSession } from "@/features/accounts/current-account";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import {
  followerCountKey,
  captureFollowingOwner,
  type FollowingTarget,
} from "./following-keys";
import { withdrawRefusedFollowingQuery } from "./follow-queries";

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
      if (!admission.admitted || (admission.bypass && !owner)) {
        throw new ApiError("cancelled");
      }

      /** Withdraws this refused count; the addressed detail rereads its own current authority. */
      async function cleanUpRefusedCount(error: ApiError) {
        // Start detail invalidation while its source signal is valid, then withdraw the count
        // before dependent reads can unmount it. No count write follows the awaited cleanup.
        const targetRejection =
          error.status === 404
            ? rejectTarget(context, target.type, target.id, error)
            : undefined;
        const countWithdrawal = withdrawRefusedFollowingQuery(
          client,
          queryKey,
          error,
        );
        await Promise.all([countWithdrawal, targetRejection]);
      }

      try {
        let headers: Record<string, string> | undefined;
        if (admission.bypass) {
          const credentials = await getCredentials();
          if (!credentials?.accessToken) {
            throw new ApiError("http", 401);
          }
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
          error instanceof ApiError &&
          (isAccessDenied(error) || isFollowRestriction(error))
        ) {
          await cleanUpRefusedCount(error);
        }
        throw error;
      }
    },
  });
}
