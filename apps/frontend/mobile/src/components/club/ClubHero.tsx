import React, {useMemo} from "react";

import type {Club} from "@/src/types/Club";
import Hero from "../common/Hero";
import SeasonSelect from "@/src/components/common/form/SeasonSelect";
import {SelectOption} from "@/src/components/common/form/SelectSheet";

export type ClubHeroProps = {
  club: Club;
  onEdit?: () => void;

  showSeasonSelect: boolean;
  seasonOptions: SelectOption[];
  selectedSeason?: string;
  onSelectSeason: (opt: SelectOption) => void;

  isSeasonLoading: boolean;
  isSeasonError: boolean;
  onRetrySeason: () => Promise<any>;
};

const AVATAR_SIZE = 90;

const ClubHero: React.FC<ClubHeroProps> = ({
                                             club,
                                             onEdit,
                                             showSeasonSelect,
                                             seasonOptions,
                                             selectedSeason,
                                             onSelectSeason,
                                             isSeasonLoading,
                                             isSeasonError,
                                             onRetrySeason,
                                           }) => {
  const topLeftNode = useMemo(() => {
    if (!showSeasonSelect) return null;
    if (isSeasonLoading) return null;
    if (isSeasonError) return null;
    if (seasonOptions.length === 0) return null;

    return (
      <SeasonSelect
        options={seasonOptions}
        selectedValue={selectedSeason ?? ""}
        onSelect={onSelectSeason}
        testIDButton="club-hero-season-button"
      />
    );
  }, [
    showSeasonSelect,
    isSeasonLoading,
    isSeasonError,
    seasonOptions,
    selectedSeason,
    onSelectSeason,
  ]);

  return (
    <Hero
      title={club.name}
      avatarUri={club.logoUrl}
      avatarFallback={require("@/assets/clubs/default_club_logo.png")}
      backgroundUri={club.logoUrl}
      backgroundFallback={require("@/assets/clubs/default_club_logo.png")}
      onEdit={onEdit}
      testID="club-hero"
      editTestID="club-hero-edit"
      containerRadius={18}
      avatarSize={AVATAR_SIZE}
      avatarRadius={24}
      blurRadius={60}
      titleLines={2}
      topLeftNode={topLeftNode}
    />
  );
};

export default ClubHero;
