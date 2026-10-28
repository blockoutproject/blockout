import { useEffect, useRef, useState } from "react";
import {
  InfiniteQueryObserver,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { currentSportingTimeZone } from "../model/sporting-time";
import { refreshCalendar } from "./sporting-calendar";

/**
 * Captures grouping at first activation and adopts a new zone only after its explicit first page
 * succeeds. Options, validated data and transport remain with the consuming calendar's Query owner.
 * A disabled native observer retains the successful target through React adoption even with F03's
 * zero-delay collection. It initiates no read and is released on replacement or calendar closure.
 * @param create the consuming owner's existing generated infinite-query options for a captured zone
 * @param active whether this category may begin its first traversal
 * @returns the retained loading zone and an explicit first-page refresh that propagates failures
 */
export function useCalendarGrouping<TPage, TKey extends QueryKey>(
  create: (
    timeZone: string,
  ) => Parameters<typeof refreshCalendar<TPage, TKey>>[1],
  active = true,
) {
  const client = useQueryClient();
  const release = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => release.current?.(), []);
  const [zone, setZone] = useState(() =>
    active ? currentSportingTimeZone() : undefined,
  );
  const timeZone = zone ?? currentSportingTimeZone();
  if (active && zone === undefined) setZone(timeZone);

  /** Retains accepted groups after failure; only successful explicit refresh adopts another zone. */
  async function refresh(nextZone: string) {
    const changed = nextZone !== timeZone;
    const options = create(nextZone);
    if (changed) {
      release.current?.();
      const observer = new InfiniteQueryObserver<
        TPage,
        Error,
        InfiniteData<TPage>,
        TKey,
        string | undefined
      >(client, {
        ...options,
        enabled: false,
      });
      // Subscribe before awaiting cancellation so closure can always release this observer.
      release.current = observer.subscribe(() => {});
    }
    try {
      if (changed)
        await client.cancelQueries({
          queryKey: create(timeZone).queryKey,
          exact: true,
        });
      await refreshCalendar(client, options);
      setZone(nextZone);
    } catch (error) {
      if (changed) {
        release.current?.();
        release.current = undefined;
      }
      throw error;
    }
  }
  return { timeZone, refresh };
}
