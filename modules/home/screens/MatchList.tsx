import { useMatches } from "@/hooks/useMatches";
import { Match } from "@/types/Match";
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
        matches,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
    } = useMatches(10);

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
                <Text style={styles.header}>Aujourd'hui</Text>

                {isLoading && (
                    <ActivityIndicator size="large" color="#0000ff" />
                )}

                {isError && (
                    <Text style={styles.errorText}>
                        Erreur : {error?.message}
                    </Text>
                )}

                <FlatList
                    data={matches}
                    keyExtractor={(item: Match) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => handleCardPress(item.id)}
                        >
                            <MatchCard match={item} />
                        </TouchableOpacity>
                    )}
                    onEndReached={loadMoreMatches}
                    onEndReachedThreshold={0.5} // Triggers halfway down
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
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 10,
        color: colors.inactive,
    },
    errorText: {
        fontSize: 16,
        color: "red",
        textAlign: "center",
    },
});

export default MatchList;
