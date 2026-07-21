import React from "react";
import {useAppTheme} from "@/src/context/ThemeProvider";
import {ClubSearchDocDTO} from "@/src/types/Club";
import EntityGradientCard from "../common/EntityGradientCard";
import {withAlpha} from "@/src/utils/utils";

export interface ClubCardProps {
  club: ClubSearchDocDTO;
  onPress: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({club, onPress}) => {
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
      testID="club-card"
      marginBottom={12}
      allowChipWrap
    />
  );
};

export default ClubCard;
