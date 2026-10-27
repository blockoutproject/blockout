import {
  hashKey,
  infiniteQueryOptions,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  ListMatchesParams,
  MatchCalendarResponse,
  MatchDayResponse,
} from "../../../../.generated/schemas/index.zod";
import type { createConsultationQueries } from "./consultation-queries";
import { resourceUnavailable } from "../model/consultation-availability";

/** Exact selector/category/loading-zone inputs; Query alone owns the exclusive continuation. */
export type CalendarSelection = Omit<ListMatchesParams, "nextDay">;

/**
 * Retains the generated selection without implicit refetch, including invalidation.
 * The shared transport keeps no-retry/always-network and current session/bypass checks.
 * Native zero-delay garbage collection discards a closed page's unobserved traversal;
 * mounted panels retain observers. A known refusal suppresses this selector across categories/zones.
 */
export function createCalendarOptions(
  queries: Pick<ReturnType<typeof createConsultationQueries>, "calendar">,
  selection: CalendarSelection,
) {
  const first = queries.calendar(selection);
  // Generated keys end with request parameters. Native partial matching addresses this selector
  // across categories/zones while preserving the generated path and session/bypass prefix.
  const scopeKey = [
    ...first.queryKey.slice(0, -1),
    {
      clubId: selection.clubId,
      seasonId: selection.seasonId,
      teamId: selection.teamId,
      poolId: selection.poolId,
    },
  ];
  return infiniteQueryOptions({
    queryKey: first.queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async (context) => {
      try {
        return await queries
          .calendar({
            ...selection,
            ...(context.pageParam ? { nextDay: context.pageParam } : {}),
          })
          .queryFn(context);
      } catch (error) {
        if (
          !context.signal.aborted &&
          error instanceof Error &&
          resourceUnavailable(error)
        ) {
          await context.client.cancelQueries({
            queryKey: scopeKey,
            predicate: (query) => query.queryHash !== hashKey(context.queryKey),
          });
          context.client
            .getQueryCache()
            .findAll({ queryKey: scopeKey })
            .forEach((query) =>
              query.setState({
                data: undefined,
                dataUpdatedAt: 0,
                error,
                status: "error",
              }),
            );
        }
        throw error;
      }
    },
    getNextPageParam: (last: MatchCalendarResponse) => last.nextDay,
    staleTime: "static",
    gcTime: 0,
    refetchOnMount: false,
    // A visited initial failure stays on its card until an explicit read retry.
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    networkMode: "always",
  });
}

/**
 * Cancels obsolete append work before a supported first-page stale fetch.
 * Native Query replaces cached pages only after success. Ordinary failure retains authorized
 * groups; the view reports explicit refresh failure without changing the loading zone.
 */
export async function refreshCalendar(
  client: QueryClient,
  options: ReturnType<typeof createCalendarOptions>,
) {
  await client.cancelQueries({ queryKey: options.queryKey, exact: true });
  return client.infiniteQuery({ ...options, staleTime: 0, pages: 1 });
}

/**
 * Applies a known match refusal to retained calendars in the captured session/bypass context.
 * Cancels older reads without reverting their data, then removes only that identity; source times,
 * grouping and continuation remain unchanged. No refusal registry or new network read is created.
 * @param client existing root QueryClient
 * @param queryKey generated calendar collection prefix in the captured session/bypass context
 * @param matchId exact identity refused by its current detail read
 */
export async function removeUnavailableCalendarMatch(
  client: QueryClient,
  queryKey: QueryKey,
  matchId: string,
) {
  await client.cancelQueries({ queryKey }, { revert: false });
  for (const query of client.getQueryCache().findAll({ queryKey })) {
    const data = client.getQueryData<InfiniteData<MatchCalendarResponse>>(
      query.queryKey,
    );
    if (data)
      query.setState({
        data: {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            days: page.days
              .map((day) => ({
                ...day,
                pools: day.pools
                  .map((pool) => ({
                    ...pool,
                    matches: pool.matches.filter(
                      (match) => match.id !== matchId,
                    ),
                  }))
                  .filter((pool) => pool.matches.length > 0),
              }))
              .filter((day) => day.pools.length > 0),
          })),
        },
      });
  }
}

/** Deduplicates moved encounters for rendering without mutating the server's retained pages. */
export function calendarDays(
  data: InfiniteData<MatchCalendarResponse> | undefined,
): MatchDayResponse[] {
  const seen = new Set<string>();
  return (
    data?.pages.flatMap((page) =>
      page.days
        .map((day) => ({
          ...day,
          pools: day.pools
            .map((pool) => ({
              ...pool,
              matches: pool.matches.filter((match) => {
                if (seen.has(match.id)) return false;
                seen.add(match.id);
                return true;
              }),
            }))
            .filter((pool) => pool.matches.length > 0),
        }))
        .filter((day) => day.pools.length > 0),
    ) ?? []
  );
}
