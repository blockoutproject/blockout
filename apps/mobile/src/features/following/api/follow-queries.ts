import { queryOptions } from "@tanstack/react-query";
import {
  getTeamFollowState,
  getPoolFollowState,
} from "../../../../.generated/mobile";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import {
  followStateKey,
  type FollowingOwner,
  type FollowingTarget,
} from "./following-keys";
import { retireSettledFollowAttempts } from "./follow-mutations";

/**
 * Defines the sole confirmed member read for a captured account/session/target.
 * Observers and uncertain-write observations share its generated call, cancellation and cache.
 * Fresh reads retire settled feedback only; a pending replacement remains provisional until it settles.
 */
export function createFollowStateQueryOptions(
  target: FollowingTarget,
  owner: FollowingOwner | null,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
) {
  return queryOptions({
    queryKey: owner
      ? followStateKey(owner, target)
      : ["following-unavailable", target.type, target.id],
    // A hidden target may reappear before its prior failed read leaves memory.
    retryOnMount: true,
    refetchOnMount: "always",
    staleTime: Infinity,
    queryFn: async ({ signal, client }) => {
      if (!owner) throw new ApiError("cancelled");
      const options = await request(signal);
      const state = await (target.type === "team"
        ? getTeamFollowState(owner.accountId, target.id, options)
        : getPoolFollowState(owner.accountId, target.id, options));
      if (
        !owner.isCurrent(owner.generation) ||
        signal.aborted ||
        options.signal?.aborted
      )
        throw new ApiError("cancelled");
      retireSettledFollowAttempts(client, owner, target);
      return state;
    },
  });
}
