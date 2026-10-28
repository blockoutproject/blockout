import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
  MatchCalendarResponse,
  PersonalMatchCalendarResponse,
} from "../../../.generated/schemas/index.zod";
import {
  filterCalendarMatches,
  withoutCalendarPool,
} from "../sporting/calendar-data";
import {
  personalCalendarCollectionKey,
  type FollowingOwner,
} from "./api/following-keys";

/** Captures the original F05 lifecycle for private calendar refusal propagation. */
export { captureFollowingOwner } from "./api/following-keys";

/**
 * Applies a current F03 match refusal to this original owner's personal envelopes in the same
 * admission context. Cancels older pages, removes only that UUID and retains dates/cursors and
 * the follow explanation. This composes the existing cache owners without a refusal registry.
 */
export async function removeUnavailablePersonalCalendarMatch(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  matchId: string,
) {
  await filterPersonalCalendars(client, owner, bypass, (calendar) =>
    filterCalendarMatches(calendar, (match) => match.id !== matchId),
  );
}

/** Removes a currently refused F03 pool from this owner's envelopes without changing follow availability. */
export async function removeUnavailablePersonalCalendarPool(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  poolId: string,
) {
  await filterPersonalCalendars(client, owner, bypass, (calendar) =>
    withoutCalendarPool(calendar, poolId),
  );
}

/** Cancels obsolete pages before projecting a known restriction within the original owner/admission. */
async function filterPersonalCalendars(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  retain: (calendar: MatchCalendarResponse) => MatchCalendarResponse,
) {
  const queryKey = personalCalendarCollectionKey(owner, bypass);
  await client.cancelQueries({ queryKey }, { revert: false });
  for (const query of client.getQueryCache().findAll({ queryKey })) {
    const data = client.getQueryData<
      InfiniteData<PersonalMatchCalendarResponse>
    >(query.queryKey);
    if (data)
      query.setState({
        data: {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            calendar: retain(page.calendar),
          })),
        },
      });
  }
}
