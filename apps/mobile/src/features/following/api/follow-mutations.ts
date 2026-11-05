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
import { isAccessDenied } from "../../../shared/api/access-denied";
import {
  followMutationKey,
  followStateKey,
  followerCountKey,
  type FollowingOwner,
  type FollowingTarget,
} from "./following-keys";
import type { useFollowStateQuery } from "./use-follow-state-query";
import { withdrawRefusedFollowingQuery } from "./follow-queries";

/** A current permission/visibility refusal suspends the personal control until a successful member read. */
export function isFollowRestriction(error: unknown): error is ApiError {
  return error instanceof ApiError && [403, 404].includes(error.status ?? 0);
}

/**
 * Applies a known current restriction to the shared member Query after cancelling older reads.
 * Refused member data is withdrawn; a later technical failure cannot restore it. The persisted relation is unchanged.
 */
export async function restrictFollowTarget(
  client: QueryClient,
  owner: FollowingOwner,
  target: FollowingTarget,
  error: ApiError,
) {
  const queryKey = followStateKey(owner, target);
  await withdrawRefusedFollowingQuery(client, queryKey, error);
}

/**
 * Accepts a confirmed replacement into the captured private cache and resets personal traversal,
 * retaining the component-owned season/category. Known refusals stay withdrawn until a successful
 * member read; ordinary invalidation and dependent read failures do not change the mutation result.
 */
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
      if (!owner || !context.usable) {
        throw new ApiError("cancelled");
      }
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
    onSuccess: (state) => {
      client.setQueryData(stateKey, (current) =>
        current === undefined ? undefined : state,
      );
    },
    onError: async (error) => {
      if (
        owner &&
        error instanceof ApiError &&
        (isAccessDenied(error) || isFollowRestriction(error))
      ) {
        await restrictFollowTarget(client, owner, target, error);
      }
    },
    onSettled: (_data, error) => {
      if (!owner) {
        return;
      }
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
        if (error) {
          void client.invalidateQueries({ queryKey });
        } else {
          void client.resetQueries({ queryKey });
        }
      }
    },
  });
}
