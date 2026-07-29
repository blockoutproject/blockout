import { useMemo, useState } from "react";

type SeasonItem = {
  season?: string | null;
};

export const getAvailableSeasons = <T extends SeasonItem>(
  items: readonly T[],
): string[] =>
  Array.from(
    new Set(
      items
        .map((item) => item.season)
        .filter((season): season is string => Boolean(season)),
    ),
  ).sort((a, b) => b.localeCompare(a));

export const filterBySeason = <T extends SeasonItem>(
  items: readonly T[],
  season: string | null,
): T[] =>
  season ? items.filter((item) => item.season === season) : [...items];

export const useSeasonFilter = <T extends SeasonItem>(
  items: readonly T[] | null | undefined,
) => {
  const [requestedSeason, setRequestedSeason] = useState<string | null>(null);
  const availableSeasons = useMemo(
    () => getAvailableSeasons(items ?? []),
    [items],
  );
  const selectedSeason =
    requestedSeason && availableSeasons.includes(requestedSeason)
      ? requestedSeason
      : (availableSeasons[0] ?? null);
  const filteredItems = useMemo(
    () => filterBySeason(items ?? [], selectedSeason),
    [items, selectedSeason],
  );

  return {
    availableSeasons,
    selectedSeason,
    setSelectedSeason: setRequestedSeason,
    filteredItems,
  };
};
