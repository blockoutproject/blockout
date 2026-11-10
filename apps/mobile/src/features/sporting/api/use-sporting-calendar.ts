import { useInfiniteQuery } from "@tanstack/react-query";
import {
  createCalendarOptions,
  type CalendarSelection,
} from "./sporting-calendar";
import { useCalendarGrouping } from "./use-calendar-grouping";
import { useConsultationQueries } from "./use-consultation-queries";

/** Owns one native sporting traversal and its retained loading zone; inactive readers do not start requests. */
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
    enabled: active,
  });
  return { calendar, refresh, queryKey: options.queryKey };
}
