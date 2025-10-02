import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    ActivityIndicator,
    Animated,
    StyleSheet,
    StyleProp,
    ViewStyle,
    RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { FlashList, FlashListRef, ListRenderItemInfo } from "@shopify/flash-list";
import { useRecyclingState } from "@shopify/flash-list";

import {
    MatchStatus,
    EnrichedDayMatchesDTO,
    EnrichedPoolMatchesDTO,
} from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useMatchList } from "@/src/hooks/match/useMatchList";
import { formatDateFrenchLocale } from "@/src/utils/utils";

import SectionDateHeader from "./SectionDateHeader";
import PoolItem from "./PoolItem";
import EmptyState from "../common/feedback/EmptyState";
import ErrorState from "../common/feedback/ErrorState";
import { SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";
import { set } from "date-fns";

export type MatchListProps = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
    scrollY: Animated.Value;
    contentContainerStyle?: StyleProp<ViewStyle>;
    headerOffset: number;
    showPoolHeader?: boolean;
    home?: boolean;
};

type HeaderRow = { type: "sectionHeader"; title: string; sectionKey: string };
type PoolRow = { type: "pool"; pool: EnrichedPoolMatchesDTO; sectionKey: string };
type Row = HeaderRow | PoolRow;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Row>);

const MatchList: React.FC<MatchListProps> = ({
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
    const listRef = useRef<FlashListRef<Row>>(null);
    const lastOffsetRef = useRef(0);

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
        try {
            await refetch();
        } finally {
            setIsRefreshing(false);
        }
    }, [refetch]);

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleMatchPress = useCallback(
        async (matchId: number) => {
            await Haptics.selectionAsync();
            router.push(`/matches/${matchId}`);
        },
        [router]
    );

    const handlePoolPress = useCallback(
        async (poolId: number) => {
            await Haptics.selectionAsync();
            router.push(`/pools/${poolId}`);
        },
        [router]
    );

    const flatData = useMemo(() => {
        const rows: Row[] = [];
        dayMatches.forEach((d: EnrichedDayMatchesDTO) => {
            const sectionKey = String(d.date);
            rows.push({
                type: "sectionHeader",
                title: formatDateFrenchLocale(d.date),
                sectionKey,
            });
            d.pools.forEach((p) => rows.push({ type: "pool", pool: p, sectionKey }));
        });
        return rows;
    }, [dayMatches]);

    const dataSignature = useMemo(() => {
        const len = dayMatches.length;
        const first = len ? String(dayMatches[0].date) : "∅";
        const last = len ? String(dayMatches[len - 1].date) : "∅";
        const poolsSig = (poolIds || []).join(",");
        const teamsSig = (teamIds || []).join(",");
        return `${status}|${len}|${first}|${last}|P:${poolsSig}|T:${teamsSig}`;
    }, [dayMatches, status, poolIds, teamIds]);

    const [_recycleTick, setRecycleTick] = useRecyclingState(
        0,
        [dataSignature],
        () => {

            scrollY.setValue(0);
        }
    );

    const getItemType = useCallback((item: Row) => {
        return item.type === "sectionHeader" ? "sectionHeader" : "row";
    }, []);

    const keyExtractor = useCallback((item: Row) => {
        return item.type === "sectionHeader"
            ? `h-${item.sectionKey}`
            : `p-${item.pool.pool.id}-${item.sectionKey}`;
    }, []);

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<Row>) => {
            switch (item.type) {
                case "sectionHeader":
                    return <SectionDateHeader title={item.title} />;
                case "pool":
                    return (
                        <PoolItem
                            enrichedPoolMatches={item.pool}
                            handlePoolPress={handlePoolPress}
                            handleMatchPress={handleMatchPress}
                            showHeader={showPoolHeader}
                        />
                    );
                default:
                    return null;
            }
        },
        [handlePoolPress, handleMatchPress, showPoolHeader]
    );

    let body: React.ReactNode;
    if (isLoading) {
        body = (
            <View
                style={[styles.center, { backgroundColor: theme.background }]}
            >
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
            <AnimatedFlashList
                ref={listRef}
                data={flatData}
                renderItem={renderItem}
                getItemType={getItemType}
                keyExtractor={keyExtractor}
                onEndReachedThreshold={0.5}
                onEndReached={handleLoadMore}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.text}
                        progressViewOffset={headerOffset}
                    />
                }
                contentContainerStyle={contentContainerStyle}
                alwaysBounceVertical
                bounces
                onScroll={
                    scrollY
                        ? Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            {
                                useNativeDriver: true,
                                listener: (e: any) => {
                                    lastOffsetRef.current = e.nativeEvent.contentOffset?.y ?? 0;
                                },
                            }
                        )
                        : undefined
                }
                scrollEventThrottle={16}
                ListEmptyComponent={() => (
                    <EmptyState
                        title="Aucun match trouvé"
                        onRetry={poolIds?.length || teamIds?.length ? refetch : undefined}
                        retryLabel={poolIds?.length || teamIds?.length ? "Réessayer" : undefined}
                        subtitle={
                            poolIds?.length || teamIds?.length
                                ? "Aucun match à venir pour les équipes ou poules sélectionnées."
                                : "Commence par suivre une équipe ou une poule pour voir les matchs ici !"
                        }
                        paddingTop={home ? "30%" : "10%"}
                    />
                )}
                ListFooterComponent={
                    isFetchingNextPage && hasNextPage ? (
                        <ActivityIndicator style={{ marginBottom: SECTION_SEPARATOR_HEIGHT }} />
                    ) : null
                }
                testID="matchlist-flashlist"
            />
        );
    }

    return body;
};

export default MatchList;

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
