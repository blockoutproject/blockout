import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { ClubSearchDocDTO } from "@/src/types/Club";
import EntityGradientCard from "../common/EntityGradientCard";

export interface ClubCardProps {
    club: ClubSearchDocDTO;
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