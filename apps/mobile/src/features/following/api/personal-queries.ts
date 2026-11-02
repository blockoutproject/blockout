import type {
  ListPersonalMatchesParams,
  PersonalMatchCalendarResponse,
  ListTeamFollows200,
  ListPoolFollows200,
} from "../../../../.generated/schemas/index.zod";
import { filterCalendarMatches } from "../../sporting/calendar-data";
import { withdrawUnavailableFollowLists } from "../lists";
import { isAccessDenied } from "../../../shared/api/access-denied";
import {
  hashKey,
  infiniteQueryOptions,
  queryOptions,
  type QueryClient,
  type QueryFilters,
  type QueryKey,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  getFollowOptions,
  listPersonalMatches,
  listTeamFollows,
  listPoolFollows,
} from "../../../../.generated/mobile";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import {
  personalCalendarKey,
  personalCalendarCollectionKey,
  followOptionsKey,
  followListKey,
  type FollowingTarget,
  type FollowingOwner,
} from "./following-keys";

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
        if (signal.aborted || options.signal?.aborted)
          throw new ApiError("cancelled");
        return result;
      } catch (error) {
        if (
          !signal.aborted &&
          error instanceof Error &&
          (isAccessDenied(error) ||
            (error instanceof ApiError && error.status === 404))
        ) {
          await withdrawRefusedPersonalCollections(
            client,
            owner,
            bypass,
            isAccessDenied(error) ? undefined : seasonId,
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
    retry: false,
    networkMode: "always",
  });
}
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
    queryFn: async ({ signal, client }) => {
      const options = await request(signal);
      const result = await getFollowOptions(owner.accountId, options);
      if (signal.aborted || options.signal?.aborted)
        throw new ApiError("cancelled");
      for (const seasonId of retainedSeasonIds(client, owner, bypass)) {
        if (result.seasons.some((season) => season.id === seasonId)) continue;
        await withdrawUnavailableFollows(client, owner, bypass, seasonId);
        if (signal.aborted || options.signal?.aborted)
          throw new ApiError("cancelled");
      }
      return result;
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
        if (signal.aborted || options.signal?.aborted)
          throw new ApiError("cancelled");
        if (!result.hasAvailableFollows)
          await withdrawUnavailableFollows(
            client,
            owner,
            bypass,
            selection.seasonId,
            queryKey,
          );
        return result;
      } catch (error) {
        // Account refusals withdraw this private collection; seasonal NotFound stays scoped to its season.
        if (
          error instanceof Error &&
          !signal.aborted &&
          (isAccessDenied(error) ||
            (error instanceof ApiError && error.status === 404))
        ) {
          await withdrawRefusedPersonalCollections(
            client,
            owner,
            bypass,
            isAccessDenied(error) ? undefined : selection.seasonId,
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
    retry: false,
    networkMode: "always",
  });
}
/** Withdraws refused personal data across both lists and calendars in the same admission context. */
async function withdrawRefusedPersonalCollections(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  seasonId: string | undefined,
  currentKey: QueryKey,
  error: Error,
) {
  for (const collection of [
    followListKey(owner, "team", {}, bypass),
    followListKey(owner, "pool", {}, bypass),
    personalCalendarCollectionKey(owner, bypass),
  ]) {
    const queryKey = [
      collection[0],
      { ...(collection[1] as object), ...(seasonId ? { seasonId } : {}) },
    ];
    await client.cancelQueries({
      queryKey,
      predicate: (query) => query.queryHash !== hashKey(currentKey),
    });
    for (const query of client.getQueryCache().findAll({ queryKey }))
      query.setState({
        data: undefined,
        dataUpdatedAt: 0,
        error,
        status: "error",
      });
  }
}
/**
 * Applies successful category-independent absence to overlapping retained selections. A seasonal
 * absence removes only that season from All seasons; an All-seasons absence withdraws every
 * cached selection. No failed read establishes absence, and no new request or registry is added.
 */
async function withdrawUnavailableFollows(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  seasonId: string | undefined,
  currentKey?: QueryKey,
) {
  await withdrawUnavailableFollowLists(
    client,
    owner,
    bypass,
    seasonId,
    currentKey,
  );
  const queryKey = personalCalendarCollectionKey(owner, bypass);
  /** Uses the canonical generated trailing selection to identify overlapping seasonal views. */
  function selectedSeason(key: QueryKey) {
    return (key.at(-1) as Omit<ListPersonalMatchesParams, "nextDay">).seasonId;
  }
  const filters = {
    queryKey,
    predicate: (query) =>
      seasonId === undefined ||
      selectedSeason(query.queryKey) === undefined ||
      selectedSeason(query.queryKey) === seasonId,
  } satisfies QueryFilters;
  await client.cancelQueries({
    ...filters,
    predicate: (query) =>
      filters.predicate(query) &&
      (currentKey === undefined || query.queryHash !== hashKey(currentKey)),
  });
  for (const query of client.getQueryCache().findAll(filters)) {
    const data = client.getQueryData<
      InfiniteData<PersonalMatchCalendarResponse>
    >(query.queryKey);
    if (!data) continue;
    const unavailable =
      seasonId === undefined || selectedSeason(query.queryKey) === seasonId;
    query.setState({
      // Established empty applicability supersedes a cancelled continuation's obsolete error.
      ...(unavailable ? { error: null, status: "success" as const } : {}),
      data: {
        ...data,
        pages: data.pages.map((page) =>
          unavailable
            ? {
                ...page,
                hasAvailableFollows: false,
                calendar: { ...page.calendar, days: [], nextDay: undefined },
              }
            : {
                ...page,
                calendar: filterCalendarMatches(
                  page.calendar,
                  (match) => match.pool.season.id !== seasonId,
                ),
              },
        ),
      },
    });
  }
}
/** Derives known seasons from the current cache, including All-seasons rows when options were evicted. */
function retainedSeasonIds(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
): Set<string> {
  const previous = client.getQueryData<
    Awaited<ReturnType<typeof getFollowOptions>>
  >(followOptionsKey(owner, bypass));
  const seasons = new Set(previous?.seasons.map((season) => season.id));
  for (const type of ["team", "pool"] as const) {
    for (const [key, data] of client.getQueriesData<
      InfiniteData<FollowListPage>
    >({
      queryKey: followListKey(owner, type, {}, bypass),
    })) {
      const selection = key.at(-1) as { seasonId?: string };
      if (selection.seasonId) seasons.add(selection.seasonId);
      for (const page of data?.pages ?? [])
        for (const item of page.items) seasons.add(item.season.id);
    }
  }
  for (const [key, data] of client.getQueriesData<
    InfiniteData<PersonalMatchCalendarResponse>
  >({
    queryKey: personalCalendarCollectionKey(owner, bypass),
  })) {
    const selection = key.at(-1) as { seasonId?: string };
    if (selection.seasonId) seasons.add(selection.seasonId);
    for (const page of data?.pages ?? [])
      for (const day of page.calendar.days)
        for (const pool of day.pools)
          for (const match of pool.matches) seasons.add(match.pool.season.id);
  }
  return seasons;
}
