import { useInfiniteQuery } from "@tanstack/react-query";
import {
  createCalendarOptions,
  type CalendarSelection,
} from "./sporting-calendar";
import { useCalendarGrouping } from "./use-calendar-grouping";
import { useConsultationQueries } from "./use-consultation-queries";

/** Owns one retained traversal and loading zone; returning to a failed pane never replays its read automatically. */
export function useSportingCalendar(
  selection: Omit<CalendarSelection, "timeZone">,
  active = true,
) {
  const queries = useConsultationQueries();
  const { timeZone, refresh } = useCalendarGrouping(
    (zone) => createCalendarOptions(queries, { ...selection, timeZone: zone }),
    active,
  );
  const options = createCalendarOptions(queries, {
    ...selection,
    timeZone,
  });
  const calendar = useInfiniteQuery({
    ...options,
    enabled: (query) => active && query.state.status !== "error",
    staleTime: Infinity,
  });
  return { calendar, refresh, queryKey: options.queryKey };
}
