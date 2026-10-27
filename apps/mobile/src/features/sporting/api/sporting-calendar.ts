import {
  infiniteQueryOptions,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  ListMatchesParams,
  MatchCalendarResponse,
  MatchDayResponse,
} from "../../../../.generated/schemas/index.zod";
import type { createConsultationQueries } from "./consultation-queries";

/** Exact selector/category/loading-zone inputs; Query alone owns the exclusive continuation. */
export type CalendarSelection = Omit<ListMatchesParams, "nextDay">;

/**
 * Retains the generated selection without implicit refetch, including invalidation.
 * The shared transport keeps no-retry/always-network and current session/bypass checks.
 */
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
    staleTime: "static",
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    networkMode: "always",
  });
}

/**
 * Cancels obsolete append work before a supported first-page stale fetch.
 * Native Query replaces data only after success; ordinary failure retains permitted pages.
 */
export async function refreshCalendar(
  client: QueryClient,
  options: ReturnType<typeof createCalendarOptions>,
) {
  await client.cancelQueries({ queryKey: options.queryKey, exact: true });
  return client.infiniteQuery({ ...options, staleTime: 0, pages: 1 });
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
