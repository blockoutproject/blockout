import { useQuery } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  getTeamFollowerCount,
  getPoolFollowerCount,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { isFollowRestriction } from "./follow-mutations";
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
  const { getCredentials } = useAuth0();
  const owner = admission.bypass ? captureFollowingOwner(session) : null;
  return useQuery({
    queryKey: followerCountKey(target, owner ?? undefined),
    enabled: admission.admitted && (!admission.bypass || owner !== null),
    refetchOnMount: "always",
    retryOnMount: true,
    queryFn: async ({ signal, client, queryKey }) => {
      try {
        let headers: Record<string, string> | undefined;
        if (admission.bypass) {
          if (!owner?.isCurrent(owner.generation))
            throw new ApiError("cancelled");
          const credentials = await getCredentials();
          if (!credentials?.accessToken) throw new ApiError("http", 401);
          headers = { Authorization: `Bearer ${credentials.accessToken}` };
        }
        const options = admission.request({
          signal,
          headers,
          session: owner ?? undefined,
        });
        return await (target.type === "team"
          ? getTeamFollowerCount(target.id, options)
          : getPoolFollowerCount(target.id, options));
      } catch (error) {
        if (
          !signal.aborted &&
          (isAccessDenied(error) || isFollowRestriction(error))
        ) {
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
