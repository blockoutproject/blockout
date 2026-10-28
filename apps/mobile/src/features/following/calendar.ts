import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { PersonalMatchCalendarResponse } from "../../../.generated/schemas/index.zod";
import { filterCalendarMatches } from "../sporting/calendar-data";
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
            calendar: filterCalendarMatches(
              page.calendar,
              (match) => match.id !== matchId,
            ),
          })),
        },
      });
  }
}
