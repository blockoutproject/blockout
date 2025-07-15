import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamTabs from "./components/TeamTabs";
import TeamProfile from "./components/TeamProfile";
import { useEnrichedTeamById } from "@/src/hooks/team/useEnrichedTeamById";

type Props = {
    teamId: number;
};

const TeamScreen: React.FC<Props> = ({ teamId }) => {
    const { data: enrichedTeam, isLoading, isError } = useEnrichedTeamById(teamId);
    const theme = useAppTheme();

    if (isLoading) {
        return <Text style={{ color: theme.text, padding: 16 }}>Chargement...</Text>;
    }

    if (isError || !enrichedTeam) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TeamProfile enrichedTeam={enrichedTeam} />
            <TeamTabs enrichedTeam={enrichedTeam} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default TeamScreen;