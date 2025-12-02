import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
    useEffect,
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
import { Ban } from "lucide-react-native";

const STATUS_FILTERS: Filter[] = [
    { name: "En attente", isActive: false },
    { name: "Actifs", isActive: false },
    { name: "Rejetés", isActive: false },
    { name: "Désactivés", isActive: false },
    { name: "Expirés", isActive: false },
];

const FILTER_NAME_TO_STATUS: Record<string, LiveLinkStatus | null> = {
    "En attente": "PENDING",
    Actifs: "ACTIVE",
    Rejetés: "REJECTED",
    Désactivés: "DEACTIVATED",
    Banni: "BANNED",
    Expirés: "EXPIRED",
};

const MatchLiveModerationScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const {
        data,
        isLoading,
        refetch,
        isRefetching,
        isError,
    } = useLiveModerationMatches();

    const [apiError, setApiError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilters, setStatusFilters] =
        useState<Filter[]>(STATUS_FILTERS);

    const [selectedMatch, setSelectedMatch] =
        useState<EnrichedMatchLiveSummaryDTO | null>(null);

    const historySheetRef = useRef<BottomSheetModal>(null);
    const listRef =
        useRef<FlashListRef<EnrichedMatchLiveSummaryDTO> | null>(null);

    const matches = useMemo<EnrichedMatchLiveSummaryDTO[]>(
        () => data ?? [],
        [data],
    );

    const activeStatusName = statusFilters.find((f) => f.isActive)?.name ?? "";
    const activeStatus = useMemo<LiveLinkStatus | null>(
        () => FILTER_NAME_TO_STATUS[activeStatusName] ?? null,
        [activeStatusName],
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

            const statusOk =
                !activeStatus || match.lastLiveLinkStatus === activeStatus;

            return searchOk && statusOk;
        });

        return filtered
            .slice()
            .sort((a, b) => {
                if (!a.matchDate || !b.matchDate) return 0;
                const da = new Date(a.matchDate).getTime();
                const db = new Date(b.matchDate).getTime();
                return db - da;
            });
    }, [matches, search, activeStatus]);

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollToOffset({
            animated: false,
            offset: 0,
        });
    }, [activeStatus]);

    const handleRefresh = useCallback(async () => {
        setApiError(null);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await refetch();
    }, [refetch]);

    const handlePressMatch = useCallback(
        (match: EnrichedMatchLiveSummaryDTO) => {
            setSelectedMatch(match);
            historySheetRef.current?.present();
        },
        [],
    );

    if (isLoading && !data) {
        return (
            <>
                <View
                    style={[
                        styles.center,
                        { backgroundColor: theme.background },
                    ]}
                >
                    <ActivityIndicator size="large" color={theme.text} />
                </View>
                <ApiErrorToast
                    message={apiError}
                    onHidden={() => setApiError(null)}
                />
            </>
        );
    }

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
                            refreshing={isRefetching}
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
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        marginTop: 40,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 8,
        marginTop: 8,
    },
    filtersRow: {
        paddingHorizontal: 8,
        paddingTop: 6,
    },
});