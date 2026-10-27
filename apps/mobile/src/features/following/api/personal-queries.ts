import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getFollowOptions } from "../../../../.generated/mobile";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { followOptionsKey, type FollowingOwner } from "./following-keys";

/** One validated options cache for the original session; failure never means no seasons. */
export function createFollowOptionsQueryOptions(
  owner: FollowingOwner,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
  bypass = false,
) {
  return queryOptions({
    queryKey: followOptionsKey(owner, bypass),
    refetchOnMount: "always",
    retryOnMount: true,
    queryFn: async ({ signal }) => {
      const options = await request(signal);
      const result = await getFollowOptions(owner.accountId, options);
      if (
        signal.aborted ||
        options.signal?.aborted ||
        !owner.isCurrent(owner.generation)
      )
        throw new ApiError("cancelled");
      return result;
    },
  });
}

/** Captured selection boundary used by seasonal list/calendar reads; it owns no list cache or retries. */
export interface PersonalSelectionRead {
  client: QueryClient;
  owner: FollowingOwner;
  seasonId: string | undefined;
  signal: AbortSignal;
  options: ReturnType<typeof createFollowOptionsQueryOptions>;
  isCurrent: () => boolean;
  selectSeason: (seasonId: string | undefined) => void;
}

/**
 * Reads once, then on seasonal NotFound rereads options once through bounded transport.
 * Successful omission selects the ordinary default; the new query key loads that context.
 * A still-offered season or failed reread preserves the original read error for explicit retry.
 * Obsolete session/selection completions never update the current choice or successful data.
 */
export async function readPersonalSelection<T>(
  context: PersonalSelectionRead,
  read: () => Promise<T>,
): Promise<T> {
  /** Rejects obsolete work before a request and after each asynchronous boundary. */
  function assertCurrent() {
    if (
      context.signal.aborted ||
      !context.owner.isCurrent(context.owner.generation) ||
      !context.isCurrent()
    )
      throw new ApiError("cancelled");
  }
  assertCurrent();
  try {
    const result = await read();
    assertCurrent();
    return result;
  } catch (error) {
    assertCurrent();
    if (
      !(error instanceof ApiError) ||
      error.status !== 404 ||
      context.seasonId === undefined
    )
      throw error;
    try {
      const options = await context.client.fetchQuery({
        ...context.options,
        staleTime: 0,
      });
      assertCurrent();
      if (!options.seasons.some((season) => season.id === context.seasonId)) {
        context.selectSeason(options.defaultSeasonId);
        throw new ApiError("cancelled");
      }
    } catch (optionsError) {
      assertCurrent();
      // The options error cannot establish disappearance or replace the original read failure.
      if (optionsError instanceof ApiError && optionsError.kind === "cancelled")
        throw optionsError;
    }
    throw error;
  }
}
