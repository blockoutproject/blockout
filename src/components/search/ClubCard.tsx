import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { ClubSearchDoc } from "@/src/types/docs/ClubSearchDoc";
import SearchCard from "./SearchCard";

export interface ClubCardProps {
    club: ClubSearchDoc;
    onPress: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onPress }) => {
    const theme = useAppTheme();

    return (
        <SearchCard
            title={club.name}
            imageUri={club.logoUrl}
            fallbackImage={require("@/assets/clubs/default_club_logo.png")}
            chips={[
                { label: club.city, icon: "map-marker", labelStyle: { fontSize: 11, color: theme.textSecondary } },
            ]}
            onPress={onPress}
            testID="club-card"
            contentFit="contain"
            marginBottom={12}
        />
    );
};

export default ClubCard;