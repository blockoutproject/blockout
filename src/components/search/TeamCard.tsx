import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import SearchCard from "./SearchCard";
import { TeamSearchDocDTO } from "@/src/types/Team";

export interface TeamCardProps {
    team: TeamSearchDocDTO;
    onPress: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onPress }) => {
    const theme = useAppTheme();

    return (
        <SearchCard
            title={team.name}
            imageUri={team.logoUrl}
            chips={[
                { label: team.divisionName, labelStyle: { fontSize: 11, color: theme.textSecondary } },
                { label: team.gender, labelStyle: { fontSize: 11, color: theme.textSecondary } },
                { label: team.season, labelStyle: { fontSize: 11, color: theme.textSecondary } },
            ]}
            onPress={onPress}
            testID="team-card"
            marginBottom={12}
        />
    );
};

export default TeamCard;