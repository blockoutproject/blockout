import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTeamById } from "@/src/hooks/team/useTeamById";
import TeamTabs from "@/src/components/team/TeamTabs";
import { useDetailedPoolsByTeam } from "@/src/hooks/pool/useDetailedPoolsByTeam";
import TeamProfile from "@/src/components/team/TeamProfile";
import { useAppTheme } from "@/src/context/ThemeProvider";

const TeamScreen: React.FC = () => {
    const { teamId } = useLocalSearchParams();
    const teamIdNumber = Number(teamId);
    const { data: team, isLoading: isTeamLoading, isError: isTeamError, isSuccess: isTeamSuccess } = useTeamById(teamIdNumber);
    const { pools, isLoading: isPoolsLoading, isError: isPoolsError, isSuccess: isPoolsSuccess } = useDetailedPoolsByTeam(teamIdNumber);
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {(isTeamLoading || isPoolsLoading) && <Text style={{ color: theme.text }}>Loading...</Text>}
            {(isTeamError || isPoolsError) && <Text style={{ color: theme.error }}>Error...</Text>}
            {isPoolsSuccess && isTeamSuccess && (
                <>
                    <TeamProfile team={team!} />
                    <TeamTabs pools={pools} team={team!} />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default TeamScreen;