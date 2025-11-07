import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import SearchCard from "./SearchCard";
import { ClubSearchDocDTO } from "@/src/types/Club";

export interface ClubCardProps {
    club: ClubSearchDocDTO;
    onPress: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onPress }) => {
    const theme = useAppTheme();

    return (
        <SearchCard
            title={club.name}
            imageUri={club.logoUrl}
            chips={[
                { label: club.city, icon: "map-marker", labelStyle: { fontSize: 12, color: theme.textSecondary } },
            ]}
            onPress={onPress}
            testID="club-card"
            marginBottom={12}
        />
    );
};

export default ClubCard;