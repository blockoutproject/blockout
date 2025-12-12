import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Keyboard,
} from "react-native";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useLiveModerationMatches } from "@/src/hooks/match/useLiveModerationMatches";
import {
    EnrichedMatchLiveSummaryDTO,
    LiveLinkStatus,
} from "@/src/types/Match";
import { Filter } from "@/src/types/Filter";

import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import SearchBar from "@/src/components/common/SearchBar";
import Filters from "@/src/components/common/Filters";
import MatchLiveModerationItem from "@/src/components/match/moderation/MatchLiveModerationItem";
import BottomSheetCustomPage from "@/src/components/common/bottomSheet/BottomSheetCustomPage";
import MatchLiveLinksHistoryScreen from "./MatchLiveLinksHistoryScreen";

const STATUS_FILTERS: Filter[] = [
    { name: "En attente", isActive: false },
    { name: "Actifs", isActive: false },
    { name: "Rejetés", isActive: false },
    { name: "Désactivés", isActive: false },
    { name: "Bannis", isActive: false },
    { name: "Expirés", isActive: false },
];

const FILTER_NAME_TO_STATUS: Record<string, LiveLinkStatus | null> = {
    "En attente": "PENDING",
    Actifs: "ACTIVE",
    Rejetés: "REJECTED",
    Désactivés: "DEACTIVATED",
    Bannis: "BANNED",
    Expirés: "EXPIRED",
};

const MatchLiveModerationScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const [apiError, setApiError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilters, setStatusFilters] =
        useState<Filter[]>(STATUS_FILTERS);

    const [selectedMatch, setSelectedMatch] =
        useState<EnrichedMatchLiveSummaryDTO | null>(null);

    const historySheetRef = useRef<BottomSheetModal>(null);
    const listRef =
        useRef<FlashListRef<EnrichedMatchLiveSummaryDTO> | null>(null);

    const activeStatusName = statusFilters.find((f) => f.isActive)?.name ?? "";
    const activeStatus = useMemo<LiveLinkStatus | null>(
        () => FILTER_NAME_TO_STATUS[activeStatusName] ?? null,
        [activeStatusName],
    );

    const {
        data,
        isLoading,
        refetch,
        isError,
    } = useLiveModerationMatches(activeStatus);

    const matches = useMemo<EnrichedMatchLiveSummaryDTO[]>(
        () => data ?? [],
        [data],
    );

    const sortedMatches = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        const filtered = matches.filter((match) => {
            const teamALabel = match.teamA.shortName ?? match.teamA.name ?? "";
            const teamBLabel = match.teamB.shortName ?? match.teamB.name ?? "";
            const searchTarget = `${teamALabel} vs ${teamBLabel}`.toLowerCase();

            const searchOk =
                normalizedSearch.length === 0 ||
                searchTarget.includes(normalizedSearch);

            return searchOk;
        });

        return filtered
            .slice()
            .sort((a, b) => {
                if (!a.matchDate || !b.matchDate) return 0;
                const da = new Date(a.matchDate).getTime();
                const db = new Date(b.matchDate).getTime();
                return db - da;
            });
    }, [matches, search]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        setApiError(null);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const handlePressMatch = useCallback(
        (match: EnrichedMatchLiveSummaryDTO) => {
            setSelectedMatch(match);
            historySheetRef.current?.present();
        },
        [],
    );

    const showFullListLoader = isLoading && !data; // premier chargement uniquement

    return (
        <>
            <View
                style={[styles.container, { backgroundColor: theme.background }]}
            >
                <View style={styles.searchRow}>
                    <SearchBar
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Rechercher un match (équipe A vs équipe B)..."
                    />
                </View>

                <View style={styles.filtersRow}>
                    <Filters
                        filters={statusFilters}
                        setFilters={setStatusFilters}
                        singleSelect
                    />
                </View>

                {/* Zone liste : soit loader centré, soit FlashList */}
                {showFullListLoader ? (
                    <View style={styles.listLoader}>
                        <ActivityIndicator size="large" color={theme.text} />
                    </View>
                ) : (
                    <FlashList
                        ref={listRef}
                        data={sortedMatches}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{
                            paddingHorizontal: 8,
                            paddingBottom: insets.bottom + 16,
                            paddingTop: 8,
                        }}
                        renderItem={({ item }) => (
                            <MatchLiveModerationItem
                                match={item}
                                onPress={() => handlePressMatch(item)}
                            />
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={handleRefresh}
                                tintColor={theme.text}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={{ color: theme.textInactive }}>
                                    Aucun match à modérer pour le moment.
                                </Text>
                            </View>
                        }
                        onScrollBeginDrag={Keyboard.dismiss}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <ApiErrorToast
                bottomOffset={insets.bottom}
                message={
                    apiError || (isError ? "Erreur lors du chargement." : null)
                }
                onHidden={() => setApiError(null)}
            />

            <BottomSheetCustomPage ref={historySheetRef}>
                {selectedMatch && (
                    <MatchLiveLinksHistoryScreen match={selectedMatch} />
                )}
            </BottomSheetCustomPage>
        </>
    );
};

export default MatchLiveModerationScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listLoader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        marginTop: 40,
    },
    searchRow: {
        marginHorizontal: 8,
        marginTop: 8,
    },
    filtersRow: {
        paddingHorizontal: 8,
        paddingTop: 6,
    },
});