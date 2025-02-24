import { DayMatchesDTO, PoolMatchesDTO, Match, MatchStatus } from "@/types/Match";
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { useMatchesWithTeamsAndPools } from "@/hooks/match/useMatchesWithTeamsAndPools";
import MatchCard from "./MatchCard";
import { Pool } from "@/types/Pool";
import { Image } from "expo-image";

type FinishedMatchesTabProps = {
    pool?: Pool;
    status: MatchStatus
};

const MatchListTab: React.FC<FinishedMatchesTabProps> = ({ pool, status }) => {
    const router = useRouter();
    const {
        dayMatches,
        teams,
        pools,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
    } = useMatchesWithTeamsAndPools(status, pool?.id);

    const handleCardPress = (matchId: number) => {
        router.push(`/match/${matchId}`);
    };

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    const loadMoreMatches = () => {
        console.log("loadMoreMatches", hasNextPage);
        if (hasNextPage) {
            fetchNextPage();
        }
    };

    type ItemProps = { day: DayMatchesDTO };
    const MatchPerDayItem = ({ day }: ItemProps) => {
        const index = Math.floor(Math.random() * 3);

        const mainLeagueColors = ["#5a8d36", "#007d89", "#bf447d"];
        const mainLeagueColor = mainLeagueColors[index];

        const secondLeagueColors = ["#2f362b", "#243335", "#3d3136"];
        const secondLeagueColor = secondLeagueColors[index];

        return (
            <View>
                <Text style={styles.dateHeader}>{day.date}</Text>
                <View style={{ gap: 10 }}>
                    {day.pools.map((pool: PoolMatchesDTO) => (
                        <View
                            key={`${day.date}#${pool.pool_id}`}
                            style={styles.poolContainer}
                        >
                            <TouchableOpacity onPress={() => handlePoolPress(pool.pool_id)}>

                                <View style={styles.poolHeader}>
                                    <Image
                                        source={require("../../assets/leagues/msl.png")}
                                        style={{
                                            width: 25,
                                            height: 25,
                                            marginRight: 8,
                                            borderRadius: 5,
                                        }}
                                        contentFit="contain"
                                    />
                                    <Text style={styles.poolTitle}>
                                        {pools[pool.pool_id]
                                            ? pools[pool.pool_id].pool_name
                                            : "Chargement..."}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={{ gap: 10 }}>
                                {pool.matches.map((match: Match) => {
                                    const teamA = teams[match.team_id_a];
                                    const teamB = teams[match.team_id_b];
                                    return (
                                        <TouchableOpacity
                                            key={match.id}
                                            onPress={() =>
                                                handleCardPress(match.id)
                                            }
                                        >
                                            <MatchCard
                                                match={match}
                                                teamA={teamA}
                                                teamB={teamB}
                                                mainColor={mainLeagueColor}
                                                secondColor={secondLeagueColor}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>

            <View style={{ ...styles.container, padding: 16 }}>

                {isLoading && <ActivityIndicator size="large" color="#0000ff" />}

                {isError && (
                    <Text style={styles.errorText}>
                        Erreur : {error?.message}
                    </Text>
                )}

                <FlatList
                    data={dayMatches}
                    keyExtractor={(item: DayMatchesDTO) => item.date}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item: day }) => (
                        <MatchPerDayItem day={day} />
                    )}
                    onEndReached={loadMoreMatches}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isFetching ? (
                            <ActivityIndicator size="small" color="#0000ff" />
                        ) : null
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    poolHeader: {
        marginBottom: 8,
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "center"
    },
    header: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 10,
        color: colors.light,
    },
    errorText: {
        fontSize: 16,
        color: "red",
        textAlign: "center",
    },
    dateHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.active,
        marginBottom: 5,
    },
    poolContainer: {
        padding: 4,
        borderRadius: 8,
        backgroundColor: colors.dark,
    },
    poolTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.inactive,
    },
});

export default MatchListTab;