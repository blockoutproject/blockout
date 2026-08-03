import React from "react";

import type { ClubResponse } from "@/src/shared/generated/models";
import Hero from "@/src/shared/ui/hero";
import SeasonSelect from "@/src/shared/ui/form/season-select";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import { toClubHeroPresentation } from "@/src/modules/club/view-models/club-hero-presentation";

export type ClubHeroProps = {
  club: ClubResponse;
  onEdit?: () => void;

  showSeasonSelect: boolean;
  seasonOptions: SelectOption<string>[];
  selectedSeason?: string;
  onSelectSeason: (value: string | null) => void;

  isSeasonLoading: boolean;
  isSeasonError: boolean;
};

const ClubHero: React.FC<ClubHeroProps> = ({
  club,
  onEdit,
  showSeasonSelect,
  seasonOptions,
  selectedSeason,
  onSelectSeason,
  isSeasonLoading,
  isSeasonError,
}) => {
  const presentation = toClubHeroPresentation(club);
  const showSeason =
    showSeasonSelect &&
    !isSeasonLoading &&
    !isSeasonError &&
    seasonOptions.length > 0;

  return (
    <Hero
      variant="title"
      title={presentation.title}
      avatarUri={presentation.avatarUri}
      avatarFallback={require("@/assets/clubs/default_club_logo.png")}
      backgroundUri={presentation.backgroundUri}
      backgroundFallback={require("@/assets/clubs/default_club_logo.png")}
      onEdit={onEdit}
      testID="club-hero"
      editTestID="club-hero-edit-action"
      topAccessory={
        showSeason ? (
          <SeasonSelect
            options={seasonOptions}
            selectedValue={selectedSeason ?? null}
            onValueChange={onSelectSeason}
            testID="club-hero-season-button"
          />
        ) : null
      }
    />
  );
};

export default ClubHero;
