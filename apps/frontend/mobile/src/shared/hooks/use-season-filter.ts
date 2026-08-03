import { useEffect, useMemo, useState } from "react";

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
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const availableSeasons = useMemo(
    () => getAvailableSeasons(items ?? []),
    [items],
  );

  useEffect(() => {
    setSelectedSeason((currentSeason) =>
      currentSeason && availableSeasons.includes(currentSeason)
        ? currentSeason
        : (availableSeasons[0] ?? null),
    );
  }, [availableSeasons]);

  const filteredItems = useMemo(
    () => filterBySeason(items ?? [], selectedSeason),
    [items, selectedSeason],
  );

  return {
    availableSeasons,
    selectedSeason,
    setSelectedSeason,
    filteredItems,
  };
};
