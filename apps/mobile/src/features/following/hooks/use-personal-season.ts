import { useState } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import type { ApiFetchOptions } from "@/shared/api/api-fetch";
import type { FollowingOwner } from "../api/following-keys";
import { createFollowOptionsQueryOptions } from "../api/personal-queries";

/**
 * Owns the personal space's in-memory choice, independent from public search and sporting sheets.
 * Undefined is an uninitialized choice, null explicitly means All seasons. Only validated options
 * can replace an unavailable season. A changed native/business owner resets only this choice,
 * preserving unrelated public descendants of the shared provider.
 */
export function usePersonalSeason(
  owner: FollowingOwner | null,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
  enabled: boolean,
  bypass = false,
) {
  const [selection, setSelection] = useState<{
    owner: FollowingOwner | null;
    choice: string | null | undefined;
  }>({ owner, choice: undefined });
  const changedOwner =
    selection.owner?.subject !== owner?.subject ||
    selection.owner?.accountId !== owner?.accountId;
  const choice = changedOwner ? undefined : selection.choice;
  const queryOptions = owner
    ? createFollowOptionsQueryOptions(owner, request, bypass)
    : undefined;
  const options = useQuery({
    ...queryOptions,
    queryKey: queryOptions?.queryKey ?? ["personal-season", null],
    queryFn: queryOptions?.queryFn ?? skipToken,
    enabled: enabled && !!owner,
  });
  const seasonId =
    choice === undefined ||
    (choice !== null &&
      options.data &&
      !options.data.seasons.some((season) => season.id === choice))
      ? options.data?.defaultSeasonId
      : (choice ?? undefined);
  // Reset only owner-bound state before descendants render; the public navigation stays mounted.
  if (changedOwner) {
    setSelection({ owner, choice: undefined });
  } else if (
    enabled &&
    options.isSuccess &&
    !options.isFetching &&
    choice !== (seasonId ?? null)
  ) {
    // Store only an established fallback; a failed read retains its prior data and choice.
    setSelection({ owner, choice: seasonId ?? null });
  }

  /** Applies a choice only to its captured owner; a detached former sheet cannot change the current season. */
  function selectSeason(value: string | undefined) {
    setSelection((current) =>
      current.owner?.subject === owner?.subject &&
      current.owner?.accountId === owner?.accountId
        ? { owner, choice: value ?? null }
        : current,
    );
  }

  /** Recalculates from the most recent successful options without replacing choice data on failure. */
  function resetSeason() {
    selectSeason(options.data?.defaultSeasonId);
  }

  return { options, seasonId, selectSeason, resetSeason };
}
