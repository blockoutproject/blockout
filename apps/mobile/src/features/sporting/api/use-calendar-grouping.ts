import { useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { currentSportingTimeZone } from "../model/sporting-time";
import { refreshCalendar } from "./sporting-calendar";

/**
 * The first active attempt retains its loading zone, even when the read fails or becomes inactive.
 * Deferred mounts use the current zone without retaining it. An explicit changed-zone refresh
 * selects a normal new key; refreshing the retained zone invalidates its complete traversal.
 */
export function useCalendarGrouping(
  create: (timeZone: string) => { queryKey: QueryKey },
  active = true,
) {
  const client = useQueryClient();
  const [retainedTimeZone, setTimeZone] = useState<string>();
  const timeZone = retainedTimeZone ?? currentSportingTimeZone();
  if (active && retainedTimeZone === undefined) {
    setTimeZone(timeZone);
  }

  /** Changes the visible query key, or explicitly refreshes the current active traversal. */
  async function refresh(nextZone: string) {
    if (!active) {
      return;
    }
    if (nextZone !== timeZone) {
      setTimeZone(nextZone);
    } else {
      await refreshCalendar(client, create(timeZone));
    }
  }

  return { timeZone, refresh };
}
