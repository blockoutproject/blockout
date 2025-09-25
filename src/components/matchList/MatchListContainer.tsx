import React, { useCallback, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";

import { MatchStatus } from "@/src/types/Match";
import { formatDateFrenchLocale } from "@/src/utils/utils";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useMatchList } from "@/src/hooks/match/useMatchList";
import SectionDateHeader from "./components/SectionDateHeader";
import PoolItem from "./components/PoolItem";
import EmptyState from "../common/feedback/EmptyState";
import ErrorState from "../common/feedback/ErrorState";
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

export type MatchListContainerProps = {
    /** Filtre par IDs de poules. */
    poolIds?: number[];
    /** Filtre par IDs d’équipes. */
    teamIds?: number[];
    /** Statut des matchs à afficher. */
    status: MatchStatus;
    /** Valeur animée pour synchroniser le scroll. */
    scrollY: Animated.Value;
    /** Styles du content container. */
    contentContainerStyle?: StyleProp<ViewStyle>;
    /** Décalage du header pour le refresh control. */
    headerOffset: number;
    /** Affiche l’en-tête de poule dans chaque carte. */
    showPoolHeader?: boolean;
    /** Spécifique à la Home (padding différent). */
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

    const handleMatchPress = useCallback(async (matchId: number) => {
        await Haptics.selectionAsync();
        router.push(`/matches/${matchId}`);
    }, [router]);

    const handlePoolPress = useCallback(async (poolId: number) => {
        await Haptics.selectionAsync();
        router.push(`/pools/${poolId}`);
    }, [router]);

    const sections = useMemo(
        () =>
            dayMatches.map((d) => ({
                key: String(d.date),
                title: formatDateFrenchLocale(d.date),
                data: d.pools.map((p, idx) => ({
                    ...p,
                    __sectionKey: d.date,
                })),
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
            <View
                style={[
                    styles.center,
                    {
                        backgroundColor: theme.background,
                    },
                ]}
                testID="matchlist-loading"
            >
                <ActivityIndicator
                    size="large"
                    color={theme.text}
                />
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
                renderItem={({ item }) => (
                    <PoolItem
                        enrichedPoolMatches={item}
                        handlePoolPress={handlePoolPress}
                        handleMatchPress={handleMatchPress}
                        showHeader={showPoolHeader}
                    />
                )}
                onEndReachedThreshold={0.5}
                onEndReached={handleLoadMore}
                ItemSeparatorComponent={() => (
                    <View
                        style={styles.itemSeparator}
                    />
                )}
                SectionSeparatorComponent={() => (
                    <View
                        style={styles.sectionSeparator}
                    />
                )}
                showsVerticalScrollIndicator={false}
                refreshControl={(
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.text}
                        progressViewOffset={headerOffset}
                    />
                )}
                ListEmptyComponent={() => (
                    <EmptyState
                        title="Aucun match trouvé"
                        onRetry={(poolIds?.length || teamIds?.length) ? refetch : undefined}
                        retryLabel={(poolIds?.length || teamIds?.length) ? "Réessayer" : undefined}
                        subtitle={
                            (poolIds?.length || teamIds?.length)
                                ? "Aucun match à venir pour les équipes ou poules sélectionnées."
                                : "Commence par suivre une équipe ou une poule pour voir les matchs ici !"
                        }
                        paddingTop={home ? "30%" : "10%"}
                    />
                )}
                scrollEnabled={sections.length > 0}
                onScroll={
                    scrollY
                        ? Animated.event(
                            [
                                {
                                    nativeEvent: {
                                        contentOffset: {
                                            y: scrollY,
                                        },
                                    },
                                },
                            ],
                            {
                                useNativeDriver: true,
                            }
                        )
                        : undefined
                }
                contentContainerStyle={contentContainerStyle}
                ListFooterComponent={
                    isFetchingNextPage && hasNextPage ? (
                        <ActivityIndicator
                            style={{
                                marginBottom: SECTION_SEPARATOR_HEIGHT,
                            }}
                        />
                    ) : null
                }
                maintainVisibleContentPosition={{
                    minIndexForVisible: sections.length > 0 ? 1 : 0,
                }}
                testID="matchlist-sectionlist"
            />
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.background,
                },
            ]}
        >
            {body}
        </View>
    );
};

export default MatchListContainer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    itemSeparator: {
        height: 6,
    },
    sectionSeparator: {
        height: SECTION_SEPARATOR_HEIGHT,
    },
});