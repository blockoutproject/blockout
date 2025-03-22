import React, { useState, useMemo, useRef } from "react";
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
import { useMatchesWithTeamsAndPools } from "@/src/hooks/match/useMatchesWithTeamsAndPools";
import { PoolMatchesDTO, MatchStatus } from "@/src/types/Match";
import { Pool } from "@/src/types/Pool";
import { Filter } from "@/src/types/Filter";
import { formatDateFrenchLocale } from "@/src/utils/utils";
import PoolItem from "./components/PoolItem";
import * as Haptics from "expo-haptics";

type MatchListTabProps = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
    filters?: Filter[];
};

const MatchListTab: React.FC<MatchListTabProps> = ({
    poolIds,
    teamIds,
    status,
    filters,
}) => {
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
        refetch,
    } = useMatchesWithTeamsAndPools(status, poolIds, teamIds);

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
        if (hasNextPage) {
            fetchNextPage();
        }
    };

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    const handleCardPress = (matchId: number) => {
        router.push(`/match/${matchId}`);
    };

    // Filtrage
    const divisionValues = ["PRO", "NAT", "REG"];
    const genderValues = ["M", "F", "O"];

    const activeDivisions = filters
        ?.filter((f) => f.isActive && divisionValues.includes(f.dbValue))
        .map((f) => f.dbValue);

    const activeGenders = filters
        ?.filter((f) => f.isActive && genderValues.includes(f.dbValue))
        .map((f) => f.dbValue);

    const applyPoolFilter = (pool: Pool) => {
        if (!pool) return false;
        const matchDivision =
            activeDivisions &&
            (activeDivisions.length === 0 || activeDivisions.includes(pool.division_code));
        const matchGender =
            activeGenders &&
            (activeGenders.length === 0 || activeGenders.includes(pool.gender));
        return filters ? matchDivision && matchGender : true;
    };

    const filteredDayMatches = dayMatches
        .map((day) => {
            const filteredPools = day.pools.filter((poolItem: PoolMatchesDTO) => {
                const poolData = pools[poolItem.pool_id];
                return applyPoolFilter(poolData);
            });
            return { ...day, pools: filteredPools };
        })
        .filter((day) => day.pools.length > 0);

    // Transformation en sections pour le SectionList
    const sections = useMemo(
        () =>
            filteredDayMatches.map((day) => ({
                title: formatDateFrenchLocale(day.date),
                data: day.pools,
            })),
        [filteredDayMatches]
    );

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <View style={styles.dateContainer}>
            <Text style={styles.dateHeader}>{title}</Text>
        </View>
    );

    const renderItem = ({ item, index }: { item: PoolMatchesDTO; index: number }) => {
        return (
            <PoolItem
                pool={item}
                index={index}
                teams={teams}
                pools={pools}
                handlePoolPress={handlePoolPress}
                handleCardPress={handleCardPress}
                mainLeagueColors={["#5a8d36", "#007d89", "#bf447d"]}
                secondLeagueColors={["#2f362b", "#243335", "#3d3136"]}
            />
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#0000ff" />
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