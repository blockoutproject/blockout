import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  replacePoolFollowState,
  replaceTeamFollowState,
  getListTeamFollowsQueryKey,
  getListPoolFollowsQueryKey,
  getListPersonalMatchesQueryKey,
  getGetFollowOptionsQueryKey,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import {
  followMutationKey,
  followStateKey,
  followerCountKey,
  type FollowingOwner,
  type FollowingTarget,
} from "./following-keys";
import type { useFollowStateQuery } from "./use-follow-state-query";

/** A current permission/visibility refusal suspends the personal control until a successful member read. */
export function isFollowRestriction(error: unknown): error is ApiError {
  return error instanceof ApiError && [403, 404].includes(error.status ?? 0);
}
/**
 * Applies a known current restriction to the shared member Query after cancelling older reads.
 * Public target absence and member refusals reuse this guard; neither deletes the persisted relation.
 */
export async function restrictFollowTarget(
  client: QueryClient,
  owner: FollowingOwner,
  target: FollowingTarget,
  error: ApiError,
) {
  const queryKey = followStateKey(owner, target);
  await client.cancelQueries({ queryKey, exact: true });
  client.getQueryCache().find({ queryKey, exact: true })?.setState({
    status: "error",
    error,
    errorUpdatedAt: Date.now(),
  });
}
/** Uses an ordinary replacement mutation and refreshes its current projections after settlement. */
export function useFollowMutation(
  target: FollowingTarget,
  context: ReturnType<typeof useFollowStateQuery>,
) {
  const client = useQueryClient();
  const { owner, request } = context;
  const stateKey = owner
    ? followStateKey(owner, target)
    : ["following-unavailable"];
  return useMutation({
    mutationKey: owner
      ? followMutationKey(owner, target)
      : ["following-unavailable"],
    retry: false,
    networkMode: "always",
    mutationFn: async (following: boolean) => {
      if (!owner || !context.usable) throw new ApiError("cancelled");
      const options = await request();
      return target.type === "team"
        ? replaceTeamFollowState(
            owner.accountId,
            target.id,
            { following },
            options,
          )
        : replacePoolFollowState(
            owner.accountId,
            target.id,
            { following },
            options,
          );
    },
    onSettled: () => {
      if (!owner) return;
      void client.invalidateQueries({ queryKey: stateKey, exact: true });
      void client.invalidateQueries({
        queryKey: getGetFollowOptionsQueryKey(owner.accountId),
      });
      void client.invalidateQueries({ queryKey: followerCountKey(target) });
      for (const queryKey of [
        getListTeamFollowsQueryKey(owner.accountId),
        getListPoolFollowsQueryKey(owner.accountId),
        getListPersonalMatchesQueryKey(owner.accountId),
      ]) {
        void client.invalidateQueries({ queryKey });
      }
    },
  });
}
