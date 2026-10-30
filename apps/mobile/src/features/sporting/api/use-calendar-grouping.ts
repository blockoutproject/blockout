import { useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { currentSportingTimeZone } from "../model/sporting-time";
import { refreshCalendar } from "./sporting-calendar";

/**
 * A changed grouping zone selects a normal new infinite-query key immediately, with its own
 * loading/error state. Refreshing the current zone uses native invalidation of all retained pages.
 * No observer, previous-zone adoption transaction or special cache retention is needed.
 */
export function useCalendarGrouping(
  create: (timeZone: string) => { queryKey: QueryKey },
  active = true,
) {
  const client = useQueryClient();
  const [timeZone, setTimeZone] = useState(currentSportingTimeZone);
  /** Changes the visible query key, or explicitly refreshes the current active traversal. */
  async function refresh(nextZone: string) {
    if (!active) return;
    if (nextZone !== timeZone) setTimeZone(nextZone);
    else await refreshCalendar(client, create(timeZone));
  }
  return { timeZone, refresh };
}
