import React from "react";
import {Club} from "@/src/types/Club";
import {SelectOption} from "@/src/shared/ui/form/SelectSheet";
import ClubHero from "@/src/components/club/ClubHero";

type ClubProfileProps = {
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

const ClubProfile: React.FC<ClubProfileProps> = ({
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
  return (
    <ClubHero
      club={club}
      onEdit={onEdit}
      showSeasonSelect={showSeasonSelect}
      seasonOptions={seasonOptions}
      selectedSeason={selectedSeason}
      onSelectSeason={onSelectSeason}
      isSeasonLoading={isSeasonLoading}
      isSeasonError={isSeasonError}
      onRetrySeason={onRetrySeason}
    />
  );
};

export default ClubProfile;
