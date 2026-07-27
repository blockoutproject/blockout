import React from "react";
import { spacing, useAppTheme, withAlpha } from "@/src/shared/theme";
import type { ClubSearchResponse } from "@/src/shared/generated/models";
import EntityGradientCard from "@/src/shared/ui/entity/entity-gradient-card";

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
      marginBottom={spacing[3]}
      minHeight={90}
    />
  );
};

export default ClubCard;
