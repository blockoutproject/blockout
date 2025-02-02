import { DayMatchesDTO, PoolMatchesDTO, Match } from "@/types/Match";
import MatchCard from "./MatchCard";

import React from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { colors } from "@/constants/colors";
import { useRouter } from "expo-router";
import Filters from "../Filters";
import { useMatchesWithTeamsAndPools } from "@/hooks/useMatchesWithTeamsAndPools";

function MatchList() {
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
    } = useMatchesWithTeamsAndPools();

    const handleCardPress = (matchId: number) => {
        router.push({
            pathname: "/match",
            params: { id: matchId.toString() },
        });
    };

    const loadMoreMatches = () => {
        if (hasNextPage) {
            fetchNextPage();
        }
    };

    return (
        <View style={styles.container}>
            <View style={{ paddingLeft: 16 }}>
                <Filters />
            </View>
            <View style={{ ...styles.container, padding: 16 }}>
                <Text style={styles.header}>Matchs par jour et pool</Text>

                {isLoading && (
                    <ActivityIndicator size="large" color="#0000ff" />
                )}

                {isError && (
                    <Text style={styles.errorText}>
                        Erreur : {error?.message}
                    </Text>
                )}

                <FlatList
                    data={dayMatches}
                    keyExtractor={(item: DayMatchesDTO) => item.date}
                    renderItem={({ item: day }) => (
                        <View>
                            <Text style={styles.dateHeader}>{day.date}</Text>
                            {day.pools.map((pool: PoolMatchesDTO) => (
                                <View key={`${day.date}#${pool.pool_id}`} style={styles.poolContainer}>
                                    <Text style={styles.poolHeader}>Pool {pool.pool_id}</Text>
                                    {pool.matches.map((match: Match) => {
                                        const teamA = teams?.find((team) => team.id === match.team_id_a);
                                        const teamB = teams?.find((team) => team.id === match.team_id_b);
                                        return (
                                            <TouchableOpacity
                                                key={match.id}
                                                onPress={() => handleCardPress(match.id)}
                                            >
                                                <MatchCard match={match} teamA={teamA} teamB={teamB} />
                                            </TouchableOpacity>
                                        )
                                    }
                                    )}
                                </View>
                            ))}
                        </View>
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
        marginBottom: 10,
        padding: 10,
        borderRadius: 8,
        backgroundColor: colors.dark,
    },
    poolHeader: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.inactive,
        marginBottom: 5,
    },
});

export default MatchList;