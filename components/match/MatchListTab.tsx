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
import { colors } from "@/constants/colors";
import { useRouter } from "expo-router";
import { useMatchesWithTeamsAndPools } from "@/hooks/match/useMatchesWithTeamsAndPools";
import MatchCard from "./MatchCard";
import { Pool } from "@/types/Pool";

type FinishedMatchesTabProps = {
    pool?: Pool;
    status: MatchStatus
};

export default function MatchListTab({ pool, status }: FinishedMatchesTabProps) {
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
                        <View>
                            <Text style={styles.dateHeader}>{day.date}</Text>
                            {day.pools.map((poolDTO: PoolMatchesDTO) => (
                                <View
                                    key={`${day.date}#${poolDTO.pool_id}`}
                                    style={styles.poolContainer}
                                >
                                    {/* Titre de la pool, que dans le cas ou plusieurs poules sont affichées */}
                                    {!pool && (
                                        <TouchableOpacity onPress={() => handlePoolPress(poolDTO.pool_id)}>
                                            <Text style={styles.poolHeader}>
                                                {pools[poolDTO.pool_id]
                                                    ? pools[poolDTO.pool_id].pool_name
                                                    : `Pool ${poolDTO.pool_id}`}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Liste des matchs */}
                                    {poolDTO.matches.map((match: Match) => {
                                        const teamA = teams[match.team_id_a];
                                        const teamB = teams[match.team_id_b];
                                        return (
                                            <TouchableOpacity
                                                key={match.id}
                                                onPress={() => handleCardPress(match.id)}
                                            >
                                                <MatchCard match={match} teamA={teamA} teamB={teamB} />
                                            </TouchableOpacity>
                                        );
                                    })}
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
        padding: 4,
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