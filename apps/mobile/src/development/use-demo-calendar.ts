import { useEffect, useState } from "react";
import { createDays, type DemoDay } from "./tab-view-fixtures";

/** Local per-calendar fixture state; no query, account, navigation or sibling calendar is affected. */
export interface DemoCalendarState {
  days: DemoDay[];
  progressive: boolean;
  refreshing: boolean;
  refreshCount: number;
  setProgressive: (enabled: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  loadDays: (count: number) => void;
}

/** Generates 120 initial matches and bounded batches; a 2.5-second refresh exposes native loader placement. */
export function useDemoCalendar(completed: boolean): DemoCalendarState {
  const [days, setDays] = useState<DemoDay[]>(() =>
    createDays(completed, 0, 4),
  );
  const [progressive, setProgressive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  useEffect(() => {
    if (!refreshing) return;
    const timer = setTimeout(() => {
      setDays(createDays(completed, 0, 4));
      setRefreshCount((count) => count + 1);
      setRefreshing(false);
    }, 2_500);
    return () => clearTimeout(timer);
  }, [completed, refreshing]);

  /** Appends absent complete days up to 3,000 matches; refresh excludes further appends. */
  function loadDays(count: number) {
    if (refreshing) return;
    setDays((current) =>
      current.length >= 100
        ? current
        : [
            ...current,
            ...createDays(
              completed,
              current.length,
              Math.min(count, 100 - current.length),
            ),
          ],
    );
  }

  return {
    days,
    progressive,
    refreshing,
    refreshCount,
    setProgressive,
    setRefreshing,
    loadDays,
  };
}
