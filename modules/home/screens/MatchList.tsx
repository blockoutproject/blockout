import { useMatches } from "@/hooks/useMatches";
import { DayMatchesDTO, PoolMatchesDTO, Match } from "@/types/Match";
import MatchCard from "../components/MatchCard";

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
import Filters from "../components/Filters";

function MatchList() {
    const router = useRouter();
    const {
        dayMatches,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
    } = useMatches(1);

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
                                <View key={pool.poolId} style={styles.poolContainer}>
                                    <Text style={styles.poolHeader}>Pool {pool.poolId}</Text>
                                    {pool.matches.map((match: Match) => (
                                        <TouchableOpacity
                                            key={match.id}
                                            onPress={() => handleCardPress(match.id)}
                                        >
                                            <MatchCard match={match} />
                                        </TouchableOpacity>
                                    ))}
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
                    contentContainerStyle={{ gap: 10 }}
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
        color: colors.light,
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