import React, { useState, useMemo, useCallback } from "react";
import {
    RefreshControl,
    View,
    Animated,
    ActivityIndicator,
    StyleSheet,
    StyleProp,
    ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { MatchStatus } from "@/src/types/Match";
import { formatDateFrenchLocale } from "@/src/utils/utils";
import EmptyState from "../common/feedback/EmptyState";
import PoolItem from "./components/PoolItem";
import { useMatchList } from "@/src/hooks/match/useMatchList";
import SectionDateHeader from "./components/SectionDateHeader";
import { useAppTheme } from "@/src/context/ThemeProvider";
import ErrorState from "../common/feedback/ErrorState";
import { useRouter } from "expo-router";
import { SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";


export type RowItem = {
    id: string;
    title: string;
    subtitle?: string;
};

export type Section = {
    key: string;
    title: string;
    data: RowItem[];
};

type MatchListContainerProps = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
    scrollY: Animated.Value;
    contentContainerStyle?: StyleProp<ViewStyle>;
    headerOffset: number;
    showPoolHeader?: boolean;
    home?: boolean;
};

const MatchListContainer: React.FC<MatchListContainerProps> = ({
    poolIds,
    teamIds,
    status,
    scrollY,
    contentContainerStyle,
    headerOffset,
    showPoolHeader = true,
    home = false,
}) => {
    const theme = useAppTheme();
    const router = useRouter();

    const {
        dayMatches,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useMatchList(status, poolIds, teamIds);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleMatchPress = useCallback((matchId: number) => {
        Haptics.selectionAsync();
        router.push(`/matches/${matchId}`);
    }, []);

    const handlePoolPress = useCallback((poolId: number) => {
        Haptics.selectionAsync();
        router.push(`/pools/${poolId}`);
    }, []);

    const sections = useMemo(
        () =>
            dayMatches.map((d) => ({
                title: formatDateFrenchLocale(d.date),
                data: d.pools.map((p, idx) => ({ ...p, __sectionKey: d.date })),
            })),
        [dayMatches]
    );

    const renderSectionHeader = useCallback(
        ({ section: { title } }: { section: { title: string } }) => (
            <SectionDateHeader title={title} />
        ),
        []
    );

    let body: React.ReactNode;

    if (isLoading) {
        body = (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    } else if (isError) {
        body = (
            <ErrorState
                subtitle="Impossible de charger les matchs."
                onRetry={refetch}
                paddingTop={home ? "50%" : "30%"}
            />
        );
    } else {
        body = (
            <Animated.SectionList
                sections={sections}
                keyExtractor={(it) => `${it.pool.id}-${it.__sectionKey}`}
                stickySectionHeadersEnabled
                renderSectionHeader={renderSectionHeader}
                renderItem={({ item, index }) => (
                    <PoolItem
                        enrichedPoolMatches={item}
                        handlePoolPress={handlePoolPress}
                        handleMatchPress={handleMatchPress}
                        showHeader={showPoolHeader}
                        appearIndex={index}
                    />
                )}
                onEndReached={handleLoadMore}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.text}
                        progressViewOffset={headerOffset}
                    />
                }
                ListEmptyComponent={() => (
                    <EmptyState
                        title="Aucun match trouvé"
                        subtitle={
                            poolIds?.length || teamIds?.length
                                ? "Aucun match à venir pour les équipes ou poules sélectionnées."
                                : "Commence par suivre une équipe ou une poule pour voir les matchs ici !"
                        }
                        paddingTop={home ? "40%" : "20%"}
                    />
                )}
                scrollEnabled={sections.length > 0}
                onScroll={
                    scrollY
                        ? Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )
                        : undefined
                }
                contentContainerStyle={contentContainerStyle}
                ListFooterComponent={
                    (isFetchingNextPage && hasNextPage) ? (
                        <ActivityIndicator style={{ marginBottom: SECTION_SEPARATOR_HEIGHT }} />
                    ) : null
                }
                maintainVisibleContentPosition={{
                    minIndexForVisible: sections.length > 0 ? 1 : 0,
                }}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {body}
        </View>
    );
};

export default MatchListContainer;

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    itemSeparator: { height: 6 },
    sectionSeparator: { height: SECTION_SEPARATOR_HEIGHT },
});