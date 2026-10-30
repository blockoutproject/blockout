import {
  infiniteQueryOptions,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  ListMatchesParams,
  MatchCalendarResponse,
  MatchDayResponse,
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import type { createConsultationQueries } from "./consultation-queries";

/** Exact selector/category/loading-zone inputs; Query alone owns the exclusive continuation. */
export type CalendarSelection = Omit<ListMatchesParams, "nextDay">;

/** Native infinite traversal retains server day cursors and uses ordinary freshness/garbage collection. */
export function createCalendarOptions(
  queries: Pick<ReturnType<typeof createConsultationQueries>, "calendar">,
  selection: CalendarSelection,
) {
  const first = queries.calendar(selection);
  return infiniteQueryOptions({
    queryKey: first.queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: (context) =>
      queries
        .calendar({
          ...selection,
          ...(context.pageParam ? { nextDay: context.pageParam } : {}),
        })
        .queryFn(context),
    getNextPageParam: (last: MatchCalendarResponse) => last.nextDay,
  });
}

/** Invalidates the selected native traversal; active infinite queries refetch every retained page. */
export function refreshCalendar(
  client: QueryClient,
  options: { queryKey: QueryKey },
) {
  return client.invalidateQueries(
    { queryKey: options.queryKey, exact: true },
    { throwOnError: true },
  );
}

/** Filters currently unauthorized rows and their empty groups while preserving source context/cursor. */
export function filterCalendarMatches(
  page: MatchCalendarResponse,
  retain: (match: MatchSummaryResponse) => boolean,
): MatchCalendarResponse {
  return {
    ...page,
    days: page.days
      .map((day) => ({
        ...day,
        pools: day.pools
          .map((pool) => ({
            ...pool,
            matches: pool.matches.filter(retain),
          }))
          .filter((pool) => pool.matches.length > 0),
      }))
      .filter((day) => day.pools.length > 0),
  };
}

/** Keeps the page's attribution/progression while dropping only groups with the refused exact pool. */
export function withoutCalendarPool(
  page: MatchCalendarResponse,
  poolId: string,
): MatchCalendarResponse {
  return {
    ...page,
    days: page.days
      .map((day) => ({
        ...day,
        pools: day.pools.filter((pool) => pool.poolId !== poolId),
      }))
      .filter((day) => day.pools.length > 0),
  };
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
