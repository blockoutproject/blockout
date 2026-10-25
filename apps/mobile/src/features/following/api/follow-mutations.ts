import {
  useMutation,
  useMutationState,
  useQueryClient,
} from "@tanstack/react-query";
import {
  replaceTeamFollowState,
  replacePoolFollowState,
  getListTeamFollowsQueryKey,
  getListPoolFollowsQueryKey,
  getListPersonalMatchesQueryKey,
} from "../../../../.generated/mobile";
import type { FollowStateResponse } from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import {
  followStateKey,
  followMutationKey,
  followOptionsKey,
  followerCountKey,
  type FollowingTarget,
} from "./following-keys";
import type { useFollowState } from "./follow-state";

/** Distinguishes a saved response from a current-state observation after response loss. */
interface FollowResult {
  state: FollowStateResponse;
  observed: boolean;
}

/**
 * Owns the shared target lifecycle after initiating-control unmount, using Query's mutation cache
 * for provisional state and a synchronous no-queue guard. Dependent reads cannot undo a saved response.
 */
export function useFollowMutation(
  target: FollowingTarget,
  context: ReturnType<typeof useFollowState>,
) {
  const client = useQueryClient();
  const { owner, bypass, request, read } = context;
  const mutationKey = owner
    ? followMutationKey(owner, target)
    : ["following-unavailable"];
  const mutation = useMutation({
    mutationKey,
    gcTime: 0,
    retry: false,
    networkMode: "always",
    onMutate: async () => {
      if (owner)
        await client.cancelQueries({
          queryKey: followStateKey(owner, target, bypass),
          exact: true,
        });
    },
    mutationFn: async (following: boolean): Promise<FollowResult> => {
      if (!owner || !owner.isCurrent(owner.generation))
        throw new ApiError("cancelled");
      // Credential preparation cannot have saved a write; only transport failures need reconciliation.
      const options = await request();
      try {
        const state = await (target.type === "team"
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
            ));
        return { state, observed: false };
      } catch (error) {
        if (
          !owner.isCurrent(owner.generation) ||
          !isUncertainMutationFailure(error)
        )
          throw error;
        // One bounded observation cannot prove that the original request has stopped.
        try {
          return { state: await read(), observed: true };
        } catch (readError) {
          // A failed observation cannot establish refusal of the original write.
          if (
            readError instanceof ApiError &&
            [403, 404].includes(readError.status ?? 0)
          )
            throw readError;
          throw error;
        }
      }
    },
    onSuccess: async (result) => {
      if (!owner?.isCurrent(owner.generation)) return;
      await client.cancelQueries({
        queryKey: followStateKey(owner, target, bypass),
        exact: true,
      });
      if (!owner.isCurrent(owner.generation)) return;
      client.setQueryData(followStateKey(owner, target, bypass), result.state);
      // Consumers own visible-tab enablement and must not supply former initial/placeholder data.
      void Promise.allSettled([
        client.resetQueries({
          predicate: ({ queryKey }) =>
            queryKey[0] === "session" &&
            queryKey[1] === owner.generation &&
            queryKey[2] === owner.accountId &&
            typeof queryKey[4] === "string" &&
            [
              getListTeamFollowsQueryKey(owner.accountId)[0],
              getListPoolFollowsQueryKey(owner.accountId)[0],
              getListPersonalMatchesQueryKey(owner.accountId)[0],
            ].some((path) => path === queryKey[4]),
        }),
        client.invalidateQueries({
          queryKey: followOptionsKey(owner, bypass),
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: followerCountKey(target),
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: followerCountKey(target, owner),
          exact: true,
        }),
      ]);
    },
  });
  const states = useMutationState({
    filters: { mutationKey, exact: true },
    select: ({ state }) => ({
      status: state.status,
      variables: state.variables,
      error: state.error,
      observed: Boolean(
        state.data &&
        typeof state.data === "object" &&
        "observed" in state.data &&
        state.data.observed,
      ),
    }),
  });
  const latest = states.at(-1);
  return {
    latest,
    pending: latest?.status === "pending",
    /** Ignores additional taps before awaiting cancellation or native credentials. */
    replace(following: boolean) {
      if (
        !context.usable ||
        !owner?.isCurrent(owner.generation) ||
        client.isMutating({ mutationKey, exact: true })
      )
        return;
      mutation.mutate(following);
    },
  };
}
