import React from "react";
import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import type { ClubSearchResponse } from "@/src/modules/search/model/Search";
import EntityGradientCard from "@/src/shared/ui/EntityGradientCard";
import { withAlpha } from "@/src/utils/utils";

export interface ClubCardProps {
  club: ClubSearchResponse;
  onPress: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onPress }) => {
  const theme = useAppTheme();

  return (
    <EntityGradientCard
      title={club.name}
      imageUri={club.logoUrl}
      chips={[
        {
          label: club.city,
          icon: "map-marker",
          borderColor: theme.textInactive,
          backgroundColor: withAlpha(theme.textInactive, 0.12),
        },
      ]}
      onPress={onPress}
      testID={`search-club-item-${club.id}`}
      marginBottom={12}
      allowChipWrap
    />
  );
};

export default ClubCard;
