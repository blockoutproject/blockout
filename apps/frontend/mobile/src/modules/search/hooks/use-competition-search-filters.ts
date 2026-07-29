import { useMemo, useState } from "react";

import { useDivisions } from "@/src/modules/division/hooks/use-divisions";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import { FormatEnum } from "@/src/shared/view-models/format-labels";
import { GenderEnum } from "@/src/shared/view-models/gender-labels";

const SEARCH_SEASONS = ["2026/2027", "2025/2026", "2024/2025"];
const SEASON_OPTIONS: SelectOption<string>[] = SEARCH_SEASONS.map((season) => ({
  value: season,
  label: season,
}));

export type CompetitionSearchFilters = {
  divisionOptions: SelectOption<number>[];
  seasonOptions: SelectOption<string>[];
  selectedDivisionId: number | null;
  selectedFormat: FormatEnum | null;
  selectedGender: GenderEnum | null;
  selectedSeason: string | null;
  setSelectedDivisionId: (value: number | null) => void;
  setSelectedFormat: (value: FormatEnum | null) => void;
  setSelectedGender: (value: GenderEnum | null) => void;
  setSelectedSeason: (value: string | null) => void;
};

/** Owns the equivalent filter state and option mapping for team and pool search. */
export const useCompetitionSearchFilters = (): CompetitionSearchFilters => {
  const { data: divisions } = useDivisions();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(
    null,
  );
  const [selectedFormat, setSelectedFormat] = useState<FormatEnum | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderEnum | null>(null);

  const divisionOptions: SelectOption<number>[] = useMemo(
    () =>
      (divisions ?? [])
        .filter((division) => division.active)
        .map((division) => ({
          value: division.id,
          label: division.name,
        })),
    [divisions],
  );

  return {
    divisionOptions,
    seasonOptions: SEASON_OPTIONS,
    selectedDivisionId,
    selectedFormat,
    selectedGender,
    selectedSeason,
    setSelectedDivisionId,
    setSelectedFormat,
    setSelectedGender,
    setSelectedSeason,
  };
};
