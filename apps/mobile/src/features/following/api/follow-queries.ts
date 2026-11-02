import { queryOptions } from "@tanstack/react-query";
import {
  getPoolFollowState,
  getTeamFollowState,
} from "../../../../.generated/mobile";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import {
  followStateKey,
  type FollowingOwner,
  type FollowingTarget,
} from "./following-keys";

/**
 * Defines the sole confirmed member read for a captured account/session/target.
 * Observers share its generated call, cancellation and cache.
 * A fresh confirmed read does not settle or replace a mounted control's provisional command.
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
      if (signal.aborted || options.signal?.aborted)
        throw new ApiError("cancelled");
      return state;
    },
  });
}
