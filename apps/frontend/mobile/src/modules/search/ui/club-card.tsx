import React from "react";
import { useAppTheme } from "@/src/shared/theme";
import type { ClubSearchResponse } from "@/src/shared/generated/models";
import EntityCard from "@/src/shared/ui/entity/entity-card";
import { toSearchClubCardPresentation } from "@/src/modules/search/view-models/search-card-presentation";

export interface ClubCardProps {
  club: ClubSearchResponse;
  onPress: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onPress }) => {
  const theme = useAppTheme();
  const presentation = toSearchClubCardPresentation(club, {
    neutral: theme.textInactive,
    male: theme.male,
    female: theme.female,
    mixed: theme.textSecondary,
  });

  return (
    <EntityCard
      presentation={presentation}
      onPress={onPress}
      testID={`search-club-item-${club.id}`}
    />
  );
};

export default ClubCard;
