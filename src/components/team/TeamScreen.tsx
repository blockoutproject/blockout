import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTeamById } from "@/src/hooks/team/useTeamById";
import { useDetailedPoolsByTeam } from "@/src/hooks/pool/useDetailedPoolsByTeam";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamTabs from "@/src/components/team/TeamTabs";
import TeamProfile from "./teamProfile/TeamProfile";

type Props = {
    teamId: number;
};

const TeamScreen: React.FC<Props> = ({ teamId }) => {
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
        <View style={[styles.container]}>
            <TeamProfile team={team!} />
            <TeamTabs pools={pools!} team={team!} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    statRow: {
        flexDirection: "row",
        gap: 16,
        alignItems: "center",
        marginBottom: 12,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    badgeText: {
        fontWeight: "600",
        fontSize: 14,
    },
    tabContainer: {
        marginTop: 8,
        paddingBottom: 16,
    },
});

export default TeamScreen;