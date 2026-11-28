import { useState } from "react";
import { currentSportingTimeZone } from "../model/sporting-time";

/**
 * The first active attempt retains its loading zone, even when the read fails or becomes inactive.
 * Deferred mounts use the current zone without retaining it.
 */
export function useCalendarGrouping(active = true) {
  const [retainedTimeZone, setTimeZone] = useState<string>();
  const timeZone = retainedTimeZone ?? currentSportingTimeZone();
  if (active && retainedTimeZone === undefined) {
    setTimeZone(timeZone);
  }

  return { timeZone, setTimeZone };
}
