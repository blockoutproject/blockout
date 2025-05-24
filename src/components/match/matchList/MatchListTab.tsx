import React, { useState, useMemo } from "react";
import {
    SectionList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    Animated,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useRouter } from "expo-router";
import { useMatchesWithEntities } from "@/src/hooks/match/useMatchesWithEntities";
import { MatchStatus } from "@/src/types/Match";
import { formatDateFrenchLocale } from "@/src/utils/utils";
import PoolItem from "./components/PoolItem";
import * as Haptics from "expo-haptics";
import type { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import EmptyPrompt from "../../common/EmptyPrompt";
import MatchListTabSkeleton from "./components/MatchListSkeleton";


type MatchListTabProps = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
    headerOffset?: number;
    scrollY: Animated.Value;
};

const MatchListTab: React.FC<MatchListTabProps> = ({
    poolIds,
    teamIds,
    status,
    headerOffset = 0,
    scrollY,
}) => {
    const router = useRouter();
    const theme = useAppTheme();

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
            <View style={[styles.dateBackground, { backgroundColor: theme.background }]}>
                <Text style={[styles.dateHeader, { color: theme.text }]}>{title}</Text>
            </View>
        </View>
    );

    const renderItem = ({ item, index }: { item: EnrichedPoolMatchesDTO; index: number }) => (
        <PoolItem
            pool={item}
            index={index}
            handlePoolPress={handlePoolPress}
            handleCardPress={handleCardPress}
            mainLeagueColors={["#5a8d36", "#007d89", "#bf447d"]}
            secondLeagueColors={["#2f362b", "#243335", "#3d3136"]}
        />
    );

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background, marginTop: headerOffset + 6 }]}>
                <MatchListTabSkeleton />
            </View>
        );
    }

    if (isError) {
        return (
            <View style={{ backgroundColor: theme.background }}>
                <Text style={[styles.errorText, { color: theme.error }]}>Erreur : {error?.message}</Text>
            </View>
        );
    }

    if (!isLoading && !isError && dayMatches.length === 0) {
        return (
            <EmptyPrompt
                title="Aucun match trouvé"
                subtitle={
                    poolIds?.length || teamIds?.length
                        ? "Aucun match à venir pour les équipes ou poules sélectionnées."
                        : "Commence par suivre une équipe ou une poule pour voir les matchs ici !"
                }
            />
        );
    }

    return (
        <View style={{ backgroundColor: theme.background }}>
            <Animated.SectionList
                sections={sections}
                keyExtractor={(item, index) => `${item.poolId}-${index}`}
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.text}
                        progressViewOffset={headerOffset + 6}
                    />
                }
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                contentContainerStyle={[
                    styles.contentContainer,
                    {
                        marginTop: headerOffset + 6,
                        paddingBottom: headerOffset + 6,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        paddingHorizontal: 8,
    },
    itemSeparator: {
        height: 16,
    },
    sectionSeparator: {
        height: 6,
    },
    dateContainer: {
        backgroundColor: "transparent",
        alignItems: "center",
    },
    dateBackground: {
        borderRadius: 14,
        paddingVertical: 4,
        paddingHorizontal: 8,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 6,
    },
    dateHeader: {
        fontSize: 14,
        fontWeight: "700",
    },
    errorText: {
        fontSize: 14,
        textAlign: "center",
    },
});

export default MatchListTab;
