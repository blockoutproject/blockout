import { colors } from "@/src/constants/Colors";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTeamById } from "@/src/hooks/team/useTeamById";
import TeamTabs from "@/src/components/team/TeamTabs";
import { useDetailedPoolsByTeam } from "@/src/hooks/pool/useDetailedPoolsByTeam";
import TeamProfile from "@/src/components/team/TeamProfile";

const TeamScreen: React.FC = () => {
    const { team_id } = useLocalSearchParams();
    const teamId = Number(team_id);
    const { data: team, isLoading: isTeamLoading, isError: isTeamError, isSuccess: isTeamSuccess } = useTeamById(teamId);
    const { pools, isLoading: isPoolsLoading, isError: isPoolsError, isSuccess: isPoolsSuccess } = useDetailedPoolsByTeam(teamId);

    return (
        <View style={styles.container}>
            {(isTeamLoading || isPoolsLoading) && <Text>Loading...</Text>}
            {(isTeamError || isPoolsError) && <Text>Error...</Text>}
            {isPoolsSuccess && isTeamSuccess && (
                <>
                    <TeamProfile team={team!} />
                    <TeamTabs pools={pools} team={team!} />
                </>
            )}
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.green,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginRight: 12,
    },
    followText: {
        color: colors.light,
        fontSize: 14,
        fontWeight: '600',
    },
    iconCounter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterText: {
        color: colors.light,
        fontSize: 14,
    },
});

export default TeamScreen;