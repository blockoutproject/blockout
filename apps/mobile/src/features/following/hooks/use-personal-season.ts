import { useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import type { FollowingOwner } from "../api/following-keys";
import {
  createFollowOptionsQueryOptions,
  readPersonalSelection,
} from "../api/personal-queries";

/**
 * Owns the personal space's in-memory choice, independent from public search and sporting sheets.
 * Undefined is an uninitialized choice, null explicitly means All seasons. Only validated options
 * can replace an unavailable season. The personal-space component keys this owner by session generation.
 */
export function usePersonalSeason(
  owner: FollowingOwner,
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>,
  enabled: boolean,
  bypass = false,
) {
  const client = useQueryClient();
  const [choice, setChoice] = useState<string | null>();
  const queryOptions = createFollowOptionsQueryOptions(owner, request, bypass);
  const options = useQuery({ ...queryOptions, enabled });
  const seasonId =
    choice === undefined ||
    (choice !== null &&
      options.data &&
      !options.data.seasons.some((season) => season.id === choice))
      ? options.data?.defaultSeasonId
      : (choice ?? undefined);
  const current = useRef(seasonId);
  useLayoutEffect(() => {
    current.current = seasonId;
  }, [seasonId]);
  // Store only an established fallback; a failed options read retains its prior data and choice.
  if (
    enabled &&
    options.isSuccess &&
    !options.isFetching &&
    owner.isCurrent(owner.generation) &&
    choice !== (seasonId ?? null)
  )
    setChoice(seasonId ?? null);

  /** Applies an explicit choice or an established fallback only to this live account generation. */
  function selectSeason(value: string | undefined) {
    if (!owner.isCurrent(owner.generation)) return;
    current.current = value;
    setChoice(value ?? null);
  }

  /** Recalculates from the most recent successful options without replacing choice data on failure. */
  function resetSeason() {
    selectSeason(options.data?.defaultSeasonId);
  }

  /** Captures each query's selection so a late result cannot repair a different tab's newer choice. */
  function read<T>(
    selectedSeason: string | undefined,
    signal: AbortSignal,
    operation: () => Promise<T>,
  ) {
    return readPersonalSelection(
      {
        client,
        owner,
        seasonId: selectedSeason,
        signal,
        options: queryOptions,
        isCurrent: () => current.current === selectedSeason,
        selectSeason,
      },
      operation,
    );
  }
  return { options, seasonId, selectSeason, resetSeason, read };
}
