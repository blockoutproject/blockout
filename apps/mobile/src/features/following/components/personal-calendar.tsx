import { Search } from "lucide-react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { CalendarCategoryEnum } from "../../../../.generated/schemas/index.zod";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import { EmptyState } from "../../../shared/components/state-card";
import { Button } from "../../../shared/components/button";
import {
  SportingCalendarView,
  useCalendarGrouping,
} from "../../sporting/calendar";
import type { FollowingOwner } from "../api/following-keys";
import {
  createPersonalCalendarOptions,
  type PersonalCalendarRead,
} from "../api/personal-queries";

/** One exact personal category/season owns its loading zone and uses the same F03 native calendar. */
export interface PersonalCalendarProps {
  owner: FollowingOwner;
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>;
  read: PersonalCalendarRead;
  seasonId?: string;
  category: CalendarCategoryEnum;
  active: boolean;
  bypass: boolean;
}

/** Keeps personal envelopes canonical in Query while selecting only F03 days for its presentation. */
export function PersonalCalendar({
  owner,
  request,
  read,
  seasonId,
  category,
  active,
  bypass,
}: PersonalCalendarProps) {
  const router = useRouter();
  const { timeZone, refresh } = useCalendarGrouping(
    (zone) =>
      createPersonalCalendarOptions(
        owner,
        request,
        { seasonId, category, timeZone: zone },
        read,
        bypass,
      ),
    active,
  );
  const options = createPersonalCalendarOptions(
    owner,
    request,
    { seasonId, category, timeZone },
    read,
    bypass,
  );
  const calendar = useInfiniteQuery({
    ...options,
    enabled: active,
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
  return (
    <SportingCalendarView
      calendar={calendar}
      active={active}
      onRefresh={refresh}
      emptyState={
        calendar.data?.hasAvailableFollows === false ? (
          <EmptyState
            title="Aucun suivi à afficher"
            description="Recherchez une équipe ou une poule pour suivre ses matchs."
          >
            <Button
              label="Rechercher une équipe ou une poule"
              fullWidth
              leadingIcon={Search}
              onPress={() => router.push("/search")}
            />
          </EmptyState>
        ) : undefined
      }
    />
  );
}
