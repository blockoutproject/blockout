import CustomTabView from "@/components/common/CustomTabView";
import MatchListTab from "@/components/match/MatchListTab";
import RankingCard from "@/components/pool/RankingCard";
import StatCard from "@/components/team/StatCard";
import TeamData from "@/components/team/TeamData";
import { colors } from "@/constants/colors";
import { useDetailedTeamPools, usePoolsByTeam } from "@/hooks/pool/usePoolsByTeam";
import { MatchStatus } from "@/types/Match";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

const TeamScreen: React.FC = () => {

    const { team_id } = useLocalSearchParams();
    const teamId = Number(team_id);
    const { data: pools, isLoading, isError } = usePoolsByTeam(teamId);


    return (
        <View style={styles.container}>
            <TeamData />
            <View style={{ position: "absolute", right: 10, top: 5 }}>
                <StatCard />
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
            <CustomTabView
                firstScreen={{
                    title: "Terminé",
                    view: () => <MatchListTab status={MatchStatus.FINISHED} />,
                }}
                secondScreen={{
                    title: "A Venir",
                    view: () => <MatchListTab status={MatchStatus.UPCOMING} />,
                }}
                thirdScreen={{
                    title: "Classement",
                    view: () => (
                        <View style={{ flex: 1 }}>
                        <ScrollView style={{ flex: 1 }}>
                            {pools && pools.map((pool) => {
                                return <RankingCard key={pool.id} poolId={pool.pool_id} />
                            })}

                        </ScrollView>
                    </View>
                    ),
                }}
                indicatorColor={colors.green}
            />
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
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