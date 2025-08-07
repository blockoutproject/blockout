import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import { useMatchList } from "@/src/hooks/match/useMatchList";
import { useThemeColor } from "@/src/hooks/useThemeColor";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";
import { TABBAR_HEIGHT } from "@/src/theme/globals";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
    scrollY: Animated.Value;
    contentContainerStyle?: StyleProp<ViewStyle>;
    headerOffset: number;
    home?: boolean;
    openSheet?: <T extends keyof SheetStackParamList>(
        screen: T,
        params: SheetStackParamList[T]
    ) => void;
};

const MatchListContainer: React.FC<Props> = ({
    poolIds,
    teamIds,
    status,
    scrollY,
    contentContainerStyle,
    headerOffset,
    home = false,
    openSheet,
}) => {
    const background = useThemeColor({}, "background");
    const text = useThemeColor({}, "text");
    const {
        dayMatches,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useMatchList(status, poolIds, teamIds);
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();
    const insets = useSafeAreaInsets();

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

    const onMatchPress = (matchId: number) => {
        Haptics.selectionAsync();
        if (home && openSheet) {
            openSheet("Match", { matchId });
        } else {
            navigation.push("Match", { matchId });
        }
    };

    const onPoolPress = (poolId: number) => {
        Haptics.selectionAsync();
        if (home && openSheet) {
            openSheet("Pool", { poolId });
        } else {
            navigation.push("Pool", { poolId });
        }
    };

    const sections = useMemo(
        () =>
            dayMatches.map((d) => ({
                title: formatDateFrenchLocale(d.date),
                data: d.pools,
            })),
        [dayMatches]
    );

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <View style={styles.dateContainer}>
            <View style={[styles.dateBackground, { backgroundColor: background }]}>
                <Text style={[styles.dateHeader, { color: text }]}>{title}</Text>
            </View>
        </View>
    );

    const renderItem = ({ item }: any) => (
        <PoolItem
            enrichedPoolMatches={item}
            handlePoolPress={onPoolPress}
            handleMatchPress={onMatchPress}
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
            );
        }

        if (isError) {
            return (
                <ErrorPrompt
                    title="Erreur de chargement"
                    subtitle="Impossible de récupérer les données. Vérifie ta connexion."
                    onRetry={refetch}
                    home
                />
            );
        }

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
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={text}
                        progressViewOffset={headerOffset + 12}
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
                contentContainerStyle={[contentContainerStyle]}
                ListFooterComponent={
                    isFetchingNextPage && hasNextPage ? <ActivityIndicator style={{ marginTop: 12}} /> : null
                }
            />
        );
    };

    return <View style={[styles.container, { backgroundColor: background }]}>{body()}</View>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    itemSeparator: {
        height: 12
    },
    dateContainer: {
        marginTop: 12,
        marginBottom: 6,
        backgroundColor: "transparent",
        alignItems: "center"
    },
    dateBackground: {
        borderRadius: 14,
        paddingHorizontal: 6,
        paddingVertical: 4
    },
    dateHeader: {
        fontSize: 16,
        fontWeight: "800"
    },
});

export default MatchListContainer;