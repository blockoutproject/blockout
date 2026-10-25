import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  getTeamFollowState,
  getPoolFollowState,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  captureFollowingOwner,
  followStateKey,
  type FollowingTarget,
} from "./following-keys";
import { retireSettledFollowAttempts } from "./follow-mutations";

/**
 * Binds the generated member read to the original account and current admission.
 * Profile errors suspend personal actions without removing public sporting content.
 * Reopening reads current state and retires older action feedback; pending actions remain shared.
 */
export function useFollowState(target: FollowingTarget) {
  const session = useAccountSession();
  const client = useQueryClient();
  const profile = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  const owner = captureFollowingOwner(session);
  const usable =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.isSuccess &&
    profile.data.accountId === owner?.accountId;
  const bypass = Boolean(admission.bypass);

  /** Prepares each captured-owner request after native credentials so F12 rechecks current intent. */
  async function request(signal?: AbortSignal) {
    if (!owner || !owner.isCurrent(owner.generation))
      throw new ApiError("cancelled");
    const credentials = await getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
      session: owner,
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }

  /** Uses the generated decoder once; transport bounds waiting and rejects obsolete responses. */
  async function read(signal?: AbortSignal) {
    if (!owner) throw new ApiError("cancelled");
    const options = await request(signal);
    return target.type === "team"
      ? getTeamFollowState(owner.accountId, target.id, options)
      : getPoolFollowState(owner.accountId, target.id, options);
  }

  const query = useQuery({
    queryKey: owner ? followStateKey(owner, target) : ["following-unavailable"],
    enabled: usable,
    // A hidden target may reappear before its prior failed read leaves memory.
    retryOnMount: true,
    refetchOnMount: "always",
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const state = await read(signal);
      if (!owner?.isCurrent(owner.generation) || signal.aborted)
        throw new ApiError("cancelled");
      retireSettledFollowAttempts(client, owner, target);
      return state;
    },
  });
  return {
    query,
    owner,
    usable,
    request,
    read,
    bypass,
    profile,
    sessionStatus: session.status,
  };
}
