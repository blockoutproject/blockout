import { NoAvailableFollows } from "./no-available-follows";
import { hashKey, useInfiniteQuery } from "@tanstack/react-query";
import type { CalendarCategoryEnum } from "../../../../.generated/schemas/index.zod";
import type { ApiFetchOptions } from "@/shared/api/api-fetch";
import {
  SportingCalendarView,
  useCalendarGrouping,
} from "@/features/sporting/calendar";
import type { FollowingOwner } from "../api/following-keys";
import { createPersonalCalendarOptions } from "../api/personal-queries";

/** One exact personal category/season owns its loading zone and uses the same F03 native calendar. */
export interface PersonalCalendarProps {
  owner: FollowingOwner;
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>;
  seasonId?: string;
  category: CalendarCategoryEnum;
  active: boolean;
  bypass: boolean;
}

/** Keeps personal envelopes canonical in Query; returning to a failed shared pane requires explicit Retry. */
export function PersonalCalendar({
  owner,
  request,
  seasonId,
  category,
  active,
  bypass,
}: Readonly<PersonalCalendarProps>) {
  const { timeZone, refresh } = useCalendarGrouping(
    (zone) =>
      createPersonalCalendarOptions(
        owner,
        request,
        { seasonId, category, timeZone: zone },
        bypass,
      ),
    active,
  );
  const options = createPersonalCalendarOptions(
    owner,
    request,
    { seasonId, category, timeZone },
    bypass,
  );
  const calendar = useInfiniteQuery({
    ...options,
    enabled: (query) => active && query.state.status !== "error",
    select: (data) => {
      const latest = data.pages.at(-1);
      return {
        ...data,
        // A successful current false withdraws every former selecting origin, unlike a failed page.
        pages:
          latest?.hasAvailableFollows === false
            ? [latest.calendar]
            : data.pages.map((page) => page.calendar),
        hasAvailableFollows: latest?.hasAvailableFollows,
      };
    },
  });

  async function refreshCalendar(nextZone: string) {
    if (nextZone === timeZone && calendar.isFetchNextPageError) {
      // An errored observer is disabled for automatic reads; the pull still rereads its complete traversal.
      await calendar.refetch({ cancelRefetch: false, throwOnError: true });
    } else {
      await refresh(nextZone);
    }
  }

  return (
    <SportingCalendarView
      key={hashKey(options.queryKey)}
      calendar={calendar}
      category={category}
      active={active}
      onRefresh={refreshCalendar}
      emptyState={
        calendar.data?.hasAvailableFollows === false ? (
          <NoAvailableFollows />
        ) : undefined
      }
    />
  );
}
