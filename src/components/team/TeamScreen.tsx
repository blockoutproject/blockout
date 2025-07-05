import React, { useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTeamById } from "@/src/hooks/team/useTeamById";
import { useDetailedPoolsByTeam } from "@/src/hooks/pool/useDetailedPoolsByTeam";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamTabs from "./components/TeamTabs";
import TeamProfile from "./components/TeamProfile";
import { useDivisionById } from "@/src/hooks/config/division/useDivisionById";

type Props = {
    teamId: number;
};

const TeamScreen: React.FC<Props> = ({ teamId }) => {
    const { data: team, isLoading: isTeamLoading, isError: isTeamError } = useTeamById(teamId);
    const { pools, isLoading: isPoolsLoading, isError: isPoolsError } = useDetailedPoolsByTeam(teamId);
    const { data: division, isLoading: isDivisionLoading, isError: isDivisionError } = useDivisionById(team?.divisionId);

    const theme = useAppTheme();

    console.log('[TeamScreen] render');
    console.log('[TeamScreen] team:', team);
    console.log('[TeamScreen] division:', division);
    console.log('[TeamScreen] pools:', pools);

    useEffect(() => {
        console.log('[TeamScreen] teamId changé:', teamId);
    }, [teamId]);

    if (isTeamLoading || isPoolsLoading || isDivisionLoading) {
        return <Text style={{ color: theme.text, padding: 16 }}>Chargement...</Text>;
    }

    if (isTeamError || isPoolsError || isDivisionError) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }


    return (
        <View style={[styles.container]}>
            <TeamProfile team={team!} division={division!} />
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