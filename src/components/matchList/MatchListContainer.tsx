import React, { useState, useMemo, useRef, useCallback } from "react";
import {
    RefreshControl,
    View,
    Text,
    Animated,
    ActivityIndicator,
    StyleSheet,
    StyleProp,
    ViewStyle,
} from "react-native";
import { MatchStatus } from "@/src/types/Match";
import { formatDateFrenchLocale } from "@/src/utils/utils";
import * as Haptics from "expo-haptics";
import EmptyPrompt from "../common/feedback/EmptyPrompt";
import ErrorPrompt from "../common/feedback/ErrorPrompt";
import PoolItem from "./components/PoolItem";
import MatchScreen from "@/src/components/match/MatchScreen";
import PoolScreen from "../pool/PoolScreen";
import { useMatchList } from "@/src/hooks/match/useMatchList";
import {
    BottomSheetModal
} from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "../common/BottomSheetCustomPage";
import { useThemeColor } from "@/src/hooks/useThemeColor";

type Props = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
    scrollY?: Animated.Value;
    headerOffset?: number;
    contentContainerStyle?: StyleProp<ViewStyle>;
    home?: boolean
};

const MatchListContainer: React.FC<Props> = ({
    poolIds,
    teamIds,
    status,
    scrollY,
    headerOffset = 0,
    contentContainerStyle,
    home = false,
}) => {
    const background = useThemeColor({}, "background");
    const text = useThemeColor({}, "text");

    const poolSheetRef = useRef<BottomSheetModal>(null);
    const matchSheetRef = useRef<BottomSheetModal>(null);
    const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    const {
        dayMatches,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isRefetching,
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

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    };

    const openPoolSheet = (id: number) => {
        Haptics.selectionAsync();
        setSelectedPoolId(id);
        poolSheetRef.current?.present();
    };

    const openMatchSheet = (id: number) => {
        Haptics.selectionAsync();
        setSelectedMatchId(id);
        matchSheetRef.current?.present();
    };

    const sections = useMemo(
        () =>
            dayMatches.map((d) => ({
                title: formatDateFrenchLocale(d.date),
                data: d.pools,
            })),
        [dayMatches]
    );

    const renderSectionHeader = ({
        section: { title },
    }: {
        section: { title: string };
    }) => (
        <View style={styles.dateContainer}>
            <View
                style={[styles.dateBackground, { backgroundColor: background }]}
            >
                <Text style={[styles.dateHeader, { color: text }]}>{title}</Text>
            </View>
        </View>
    );

    const renderItem = ({ item }: any) => (
        <PoolItem
            enrichedPoolMatches={item}
            handlePoolPress={openPoolSheet}
            handleMatchPress={openMatchSheet}
        />
    );

    const renderEmpty = () => (
        <EmptyPrompt
            title="Aucun match trouvé"
            subtitle={
                poolIds?.length || teamIds?.length
                    ? "Aucun match à venir pour les équipes ou poules sélectionnées."
                    : "Commence par suivre une équipe ou une poule pour voir les matchs ici !"
            }
            home
        />
    );

    const body = () => {
        if (isLoading) {
            return (
                <ActivityIndicator
                    size="large"
                    color={text}
                    style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                />
            )
        }

        if (isError)
            return (
                <ErrorPrompt
                    title="Erreur de chargement"
                    subtitle="Impossible de récupérer les données. Vérifie ta connexion."
                    onRetry={refetch}
                    home
                />
            );

        return (
            <Animated.SectionList
                sections={sections}
                keyExtractor={(it, i) => `${it.pool.id}-${i}`}
                initialNumToRender={10}
                stickySectionHeadersEnabled
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                onEndReached={handleLoadMore}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={text}
                        progressViewOffset={headerOffset + 6}
                    />
                }
                ListEmptyComponent={renderEmpty}
                scrollEnabled={sections.length > 0}
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
        );
    };

    return (
        <>
            <View style={[styles.container, { backgroundColor: background }]}>
                {body()}
            </View>

            <BottomSheetCustomPage ref={poolSheetRef}>
                {selectedPoolId && <PoolScreen poolId={selectedPoolId} />}
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={matchSheetRef}>
                {selectedMatchId && <MatchScreen matchId={selectedMatchId} />}
            </BottomSheetCustomPage>
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    sectionListContent: { paddingBottom: 8 },
    itemSeparator: { height: 16 },
    sectionSeparator: { height: 6 },
    dateContainer: { backgroundColor: "transparent", alignItems: "center" },
    dateBackground: {
        borderRadius: 14,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    dateHeader: { fontSize: 16, fontWeight: "800" },
});

export default MatchListContainer;