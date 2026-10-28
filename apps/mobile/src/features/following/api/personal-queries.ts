import type {
  ListPersonalMatchesParams,
  PersonalMatchCalendarResponse,
} from "../../../../.generated/schemas/index.zod";
import { filterCalendarMatches } from "../../sporting/calendar-data";
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
} from "../../../../.generated/mobile";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import {
  personalCalendarKey,
  personalCalendarCollectionKey,
  followOptionsKey,
  type FollowingOwner,
} from "./following-keys";

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

/**
 * Retains validated personal envelopes in the root Query cache. A continuation is an exclusive
 * sporting day; visible observers alone load reset queries, without replaying failed reads.
 */
export function createPersonalCalendarOptions(
  owner: FollowingOwner,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
  selection: Omit<ListPersonalMatchesParams, "nextDay">,
  read: PersonalCalendarRead,
  bypass = false,
) {
  const queryKey = personalCalendarKey(owner, selection, bypass);
  return infiniteQueryOptions({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam, client }) => {
      try {
        const result = await read(selection.seasonId, signal, async () => {
          const options = await request(signal);
          const result = await listPersonalMatches(
            owner.accountId,
            {
              ...selection,
              ...(pageParam ? { nextDay: pageParam } : {}),
            },
            options,
          );
          if (
            signal.aborted ||
            options.signal?.aborted ||
            !owner.isCurrent(owner.generation)
          )
            throw new ApiError("cancelled");
          return result;
        });
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
          owner.isCurrent(owner.generation) &&
          (isAccessDenied(error) ||
            (error instanceof ApiError && error.status === 404))
        ) {
          const scope = [
            ...queryKey.slice(0, -1),
            ...(isAccessDenied(error) || selection.seasonId === undefined
              ? []
              : [{ seasonId: selection.seasonId }]),
          ];
          await client.cancelQueries({
            queryKey: scope,
            predicate: (query) => query.queryHash !== hashKey(queryKey),
          });
          for (const query of client
            .getQueryCache()
            .findAll({ queryKey: scope }))
            query.setState({
              data: undefined,
              dataUpdatedAt: 0,
              error,
              status: "error",
            });
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
  currentKey: QueryKey,
) {
  const queryKey = personalCalendarCollectionKey(owner, bypass);
  /** Uses the canonical generated trailing selection to identify overlapping seasonal views. */
  function selectedSeason(key: QueryKey) {
    return (key.at(-1) as Omit<ListPersonalMatchesParams, "nextDay">).seasonId;
  }
  const filters: QueryFilters = {
    queryKey,
    predicate: (query) =>
      query.queryHash !== hashKey(currentKey) &&
      (seasonId === undefined ||
        selectedSeason(query.queryKey) === undefined ||
        selectedSeason(query.queryKey) === seasonId),
  };
  await client.cancelQueries(filters, { revert: false });
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

/** The shared personal-season owner bounds NotFound reconciliation for the captured selection. */
export type PersonalCalendarRead = <T>(
  seasonId: string | undefined,
  signal: AbortSignal,
  operation: () => Promise<T>,
) => Promise<T>;
