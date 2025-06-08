import React, { useState, useMemo } from "react";
import {
    RefreshControl,
    Text,
    View,
    Animated,
    StyleProp,
    ViewStyle,
    ActivityIndicator,
    StyleSheet
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { MatchStatus } from "@/src/types/Match";
import { formatDateFrenchLocale } from "@/src/utils/utils";
import * as Haptics from "expo-haptics";
import EmptyPrompt from "../common/feedback/EmptyPrompt";
import { useGlobalBottomSheet } from "@/src/context/GlobalBottomSheetProvider";
import MatchContainer from "@/src/components/match/Match";
import PoolContainer from "../pool/PoolContainer";
import { useMatchList } from "@/src/hooks/match/useMatchList";
import ErrorPrompt from "../common/feedback/ErrorPrompt";
import MatchListSkeleton from "./components/MatchListSkeleton";
import PoolItem from "./components/PoolItem";

type MatchListContainerProps = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
    scrollY?: Animated.Value;
    headerOffset?: number;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

const MatchList: React.FC<MatchListContainerProps> = ({
    poolIds,
    teamIds,
    status,
    scrollY,
    headerOffset = 0,
    contentContainerStyle,
}) => {
    const theme = useAppTheme();
    const { openSheet } = useGlobalBottomSheet();

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
        Haptics.selectionAsync();
        openSheet(<PoolContainer poolId={poolId} />);
    };

    const handleMatchPress = (matchId: number) => {
        Haptics.selectionAsync();
        openSheet(<MatchContainer matchId={matchId} />);
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

    const renderItem = ({ item, index }: any) => (
        <PoolItem
            pool={item}
            index={index}
            handlePoolPress={handlePoolPress}
            handleMatchPress={handleMatchPress}
            mainLeagueColors={["#5a8d36", "#007d89", "#bf447d"]}
            secondLeagueColors={["#2f362b", "#243335", "#3d3136"]}
        />
    );

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: headerOffset }]}>
                <MatchListSkeleton />
            </View>
        );
    }

    if (isError) {
        return (
            <ErrorPrompt
                title="Erreur de chargement"
                subtitle="Impossible de récupérer les données. Vérifie ta connexion."
                onRetry={() => refetch()}
            />
        );
    }

    if (!dayMatches.length) {
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
                initialNumToRender={5}
                stickySectionHeadersEnabled
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
                onScroll={
                    scrollY
                        ? Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )
                        : undefined
                }
                contentContainerStyle={[styles.sectionListContent, contentContainerStyle]}
                ListFooterComponent={
                    isFetchingNextPage && hasNextPage ? <ActivityIndicator /> : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
    },
    sectionListContent: {
        paddingBottom: 8,
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
        paddingHorizontal: 4,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 5,
        elevation: 5,
    },
    dateHeader: {
        fontSize: 14,
        fontWeight: "800",
    },
});

export default MatchList;