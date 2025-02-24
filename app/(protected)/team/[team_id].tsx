import TeamStatsCard from "@/components/team/TeamStatsCard";
import TeamInfoCard from "@/components/team/TeamInfoCard";
import { colors } from "@/constants/Colors";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTeamById } from "@/hooks/team/useTeamById";
import TeamTabs from "@/components/team/TeamTabs";
import { useDetailedPoolsByTeam } from "@/hooks/pool/useDetailedPoolsByTeam";

const TeamScreen: React.FC = () => {

    const { team_id } = useLocalSearchParams();
    const teamId = Number(team_id);
    const { data: team, isLoading: isTeamLoading, isError: isTeamError, isSuccess: isTeamSuccess } = useTeamById(teamId);
    const { data: pools, isLoading: isPoolsLoading, isError: isPoolsError, isSuccess: isPoolsSuccess } = useDetailedPoolsByTeam(teamId);

    return (
        <View style={styles.container}>
            {(isTeamLoading || isPoolsLoading) && <Text>Loading...</Text>}
            {(isTeamError || isPoolsError) && <Text>Error...</Text>}
            {isPoolsSuccess && isTeamSuccess &&
                <>
                    <TeamInfoCard team={team} />
                    <View style={{ position: "absolute", right: 10, top: 5 }}>
                        <TeamStatsCard team={team}/>
                    </View>
                    <View
                        style={{
                            marginLeft: 15,
                            marginBottom: 20,
                        }}
                    >
                        <Pressable onPress={() => console.log("follow")}>
                            <View style={styles.followContainer}>
                                <Text style={styles.followText}>Suivre</Text>
                                <MaterialCommunityIcons
                                    name={"plus"}
                                    size={20}
                                    color={colors.light}
                                />
                            </View>
                        </Pressable>
                    </View>
                    {/* pools! is safe because we know pools is defined with isPoolsSuccess */}
                    <TeamTabs pools={pools!} />
                </>
            }
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    followContainer: {
        backgroundColor: colors.green,
        flexDirection: "row",
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 5,
        borderRadius: 20,
        alignItems: "center",
        alignSelf: "flex-start",
    },
    followText: {
        color: colors.light,
        fontWeight: "500",
        fontSize: 16,
    },
});

export default TeamScreen;