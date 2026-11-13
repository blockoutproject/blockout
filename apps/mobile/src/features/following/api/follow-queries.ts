import {
  queryOptions,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  getPoolFollowState,
  getTeamFollowState,
} from "../../../../.generated/mobile";
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";
import { isAccessDenied } from "@/shared/api/access-denied";
import {
  followStateKey,
  type FollowingOwner,
  type FollowingTarget,
} from "./following-keys";

/**
 * Stops the refused read before withdrawing its exact cached representation. Cancelling without
 * reversion prevents unmount during native retries from restoring forbidden data; explicit retry
 * remains with the current observer and ordinary transient retry settings stay unchanged. Silent
 * cancellation leaves the HTTP refusal authoritative; the purge runs before awaiting cancellation
 * so it cannot later overwrite a newly started read.
 */
export async function withdrawRefusedFollowingQuery(
  client: QueryClient,
  queryKey: QueryKey,
  error: ApiError,
) {
  const cancellation = client.cancelQueries(
    { queryKey, exact: true },
    { revert: false, silent: true },
  );
  client.getQueryCache().find({ queryKey, exact: true })?.setState({
    data: undefined,
    dataUpdatedAt: 0,
    error,
    errorUpdatedAt: Date.now(),
    status: "error",
    fetchStatus: "idle",
  });
  await cancellation;
}

/**
 * Defines the sole confirmed member read for a captured account/session/target.
 * Observers share its generated call, cancellation and cache.
 * A current refusal withdraws the member data until a successful read; transient failures retain authorized data.
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
    queryFn: async ({ signal, client, queryKey }) => {
      if (!owner) {
        throw new ApiError("cancelled");
      }
      try {
        const options = await request(signal);
        const state = await (target.type === "team"
          ? getTeamFollowState(owner.accountId, target.id, options)
          : getPoolFollowState(owner.accountId, target.id, options));
        if (signal.aborted || options.signal?.aborted) {
          throw new ApiError("cancelled");
        }
        return state;
      } catch (error) {
        if (
          !signal.aborted &&
          error instanceof ApiError &&
          (isAccessDenied(error) || error.status === 404)
        ) {
          await withdrawRefusedFollowingQuery(client, queryKey, error);
        }
        throw error;
      }
    },
  });
}
