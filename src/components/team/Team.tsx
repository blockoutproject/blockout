import React from "react";
import { Text, View } from "react-native";
import { useTeamById } from "@/src/hooks/team/useTeamById";
import { useDetailedPoolsByTeam } from "@/src/hooks/pool/useDetailedPoolsByTeam";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamTabs from "@/src/components/team/TeamTabs";
import { teamStyles } from "./teamStyles";
import TeamProfile from "./teamProfile/TeamProfile";

type Props = {
    teamId: number;
};

const Team: React.FC<Props> = ({ teamId }) => {
    const { data: team, isLoading: isTeamLoading, isError: isTeamError } = useTeamById(teamId);
    const { pools, isLoading: isPoolsLoading, isError: isPoolsError } = useDetailedPoolsByTeam(teamId);
    const theme = useAppTheme();

    const isLoading = isTeamLoading || isPoolsLoading;
    const isError = isTeamError || isPoolsError;

    if (isLoading) {
        return <Text style={{ color: theme.text, padding: 16 }}>Chargement...</Text>;
    }

    if (isError) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }

    return (
        <View style={[teamStyles.container]}>
            <TeamProfile team={team!} />
            <TeamTabs pools={pools!} team={team!} />
        </View>
    );
};

export default Team;