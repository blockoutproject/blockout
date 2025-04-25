import React, { useState, useMemo } from "react";
import {
    ActivityIndicator,
    SectionList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { colors } from "@/src/constants/Colors";
import { useRouter } from "expo-router";
import { useMatchesWithEntities } from "@/src/hooks/match/useMatchesWithEntities";
import { MatchStatus } from "@/src/types/Match";
import { Filter } from "@/src/types/Filter";
import { formatDateFrenchLocale } from "@/src/utils/utils";
import PoolItem from "./components/PoolItem";
import * as Haptics from "expo-haptics";
import type { EnrichedPoolMatchesDTO, PoolMatchesDTO } from "@/src/types/Match";
import type { Pool } from "@/src/types/Pool";

type MatchListTabProps = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
};

const MatchListTab: React.FC<MatchListTabProps> = ({
    poolIds,
    teamIds,
    status,
}) => {
    const router = useRouter();

    const {
        dayMatches,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch,
    } = useMatchesWithEntities(status, poolIds, teamIds);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        try {
            setIsRefreshing(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await refetch();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    const handleCardPress = (matchId: number) => {
        router.push(`/match/${matchId}`);
    };

    const sections = useMemo(() => {
        return dayMatches.map((day) => ({
            title: formatDateFrenchLocale(day.date),
            data: day.pools,
        }));
    }, [dayMatches]);

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <View style={styles.dateContainer}>
            <Text style={styles.dateHeader}>{title}</Text>
        </View>
    );

    const renderItem = ({ item, index }: { item: EnrichedPoolMatchesDTO; index: number }) => {
        return (
            <PoolItem
                pool={item}
                index={index}
                handlePoolPress={handlePoolPress}
                handleCardPress={handleCardPress}
                mainLeagueColors={["#5a8d36", "#007d89", "#bf447d"]}
                secondLeagueColors={["#2f362b", "#243335", "#3d3136"]}
            />
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Erreur : {error?.message}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => `${item.pool_id}-${index}`}
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.light}
                    />
                }
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingHorizontal: 12 }}
            />
        </View>
    );
};

export default MatchListTab;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.dark,
    },
    dateContainer: {
        backgroundColor: colors.dark,
        paddingVertical: 8,
        paddingStart: 8,
    },
    dateHeader: {
        textAlign: "left",
        fontSize: 18,
        fontWeight: "700",
        color: colors.active,
    },
    errorText: {
        fontSize: 16,
        color: "red",
        textAlign: "center",
    },
});