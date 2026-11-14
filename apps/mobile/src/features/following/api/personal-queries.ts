import type {
  ListPersonalMatchesParams,
  PersonalMatchCalendarResponse,
  ListTeamFollows200,
  ListPoolFollows200,
} from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "@/shared/api/access-denied";
import {
  hashKey,
  infiniteQueryOptions,
  queryOptions,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  getFollowOptions,
  listPersonalMatches,
  listTeamFollows,
  listPoolFollows,
} from "../../../../.generated/mobile";
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";
import {
  personalCalendarKey,
  personalCalendarCollectionKey,
  followOptionsKey,
  followListKey,
  type FollowingTarget,
  type FollowingOwner,
} from "./following-keys";
import { withdrawRefusedFollowingQuery } from "./follow-queries";

/** Canonical F03 summaries remain inside their generated F06 collection envelopes. */
export type FollowListPage = ListTeamFollows200 | ListPoolFollows200;

/** Retains each private type/season traversal, with pageParam owning its bounded continuation. */
export function createFollowListOptions(
  owner: FollowingOwner,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
  type: FollowingTarget["type"],
  seasonId: string | undefined,
  bypass = false,
) {
  const selection = seasonId ? { seasonId } : {};
  const queryKey = followListKey(owner, type, selection, bypass);
  return infiniteQueryOptions({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ signal, pageParam, client }): Promise<FollowListPage> => {
      try {
        const options = await request(signal);
        const result = await (
          type === "team" ? listTeamFollows : listPoolFollows
        )(owner.accountId, { ...selection, page: pageParam }, options);
        if (signal.aborted || options.signal?.aborted) {
          throw new ApiError("cancelled");
        }
        return result;
      } catch (error) {
        if (
          !signal.aborted &&
          error instanceof Error &&
          (isAccessDenied(error) ||
            (error instanceof ApiError && error.status === 404 && !seasonId))
        ) {
          await withdrawRefusedPersonalCollections(
            client,
            owner,
            bypass,
            queryKey,
            error,
          );
        }
        throw error;
      }
    },
    getNextPageParam: (last) => last.nextPage,
    staleTime: Infinity,
    refetchOnMount: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** One validated options cache for the original session; refusals withdraw only forbidden options, never infer no seasons. */
export function createFollowOptionsQueryOptions(
  owner: FollowingOwner,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
  bypass = false,
) {
  return queryOptions({
    queryKey: followOptionsKey(owner, bypass),
    refetchOnMount: "always",
    retryOnMount: true,
    queryFn: async ({ signal, client, queryKey }) => {
      try {
        const options = await request(signal);
        const result = await getFollowOptions(owner.accountId, options);
        if (signal.aborted || options.signal?.aborted) {
          throw new ApiError("cancelled");
        }
        return result;
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

/**
 * Retains validated personal envelopes in the root Query cache. A continuation is an exclusive
 * sporting day; visible observers alone load reset queries, without replaying failed reads.
 */
export function createPersonalCalendarOptions(
  owner: FollowingOwner,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
  selection: Omit<ListPersonalMatchesParams, "nextDay">,
  bypass = false,
) {
  const queryKey = personalCalendarKey(owner, selection, bypass);
  return infiniteQueryOptions({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam, client }) => {
      try {
        const options = await request(signal);
        const result = await listPersonalMatches(
          owner.accountId,
          { ...selection, ...(pageParam ? { nextDay: pageParam } : {}) },
          options,
        );
        if (signal.aborted || options.signal?.aborted) {
          throw new ApiError("cancelled");
        }
        return result;
      } catch (error) {
        // A missing selected season does not revoke the owner’s other retained sporting projections.
        if (
          error instanceof Error &&
          !signal.aborted &&
          (isAccessDenied(error) ||
            (error instanceof ApiError &&
              error.status === 404 &&
              !selection.seasonId))
        ) {
          await withdrawRefusedPersonalCollections(
            client,
            owner,
            bypass,
            queryKey,
            error,
          );
        }
        throw error;
      }
    },
    getNextPageParam: (last: PersonalMatchCalendarResponse) =>
      last.calendar.nextDay,
    staleTime: Infinity,
    refetchOnMount: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Withdraws private collections after an account refusal; seasonal absence uses native Query errors. */
async function withdrawRefusedPersonalCollections(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  currentKey: QueryKey,
  error: Error,
) {
  for (const queryKey of [
    followListKey(owner, "team", {}, bypass),
    followListKey(owner, "pool", {}, bypass),
    personalCalendarCollectionKey(owner, bypass),
  ]) {
    await client.cancelQueries({
      queryKey,
      predicate: (query) => query.queryHash !== hashKey(currentKey),
    });
    for (const query of client.getQueryCache().findAll({ queryKey })) {
      query.setState({
        data: undefined,
        dataUpdatedAt: 0,
        error,
        status: "error",
      });
    }
  }
}
