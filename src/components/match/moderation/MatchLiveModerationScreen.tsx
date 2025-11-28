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
import { FlashList } from "@shopify/flash-list";
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
    const [statusFilters, setStatusFilters] = useState<Filter[]>([
        { name: "En attente", isActive: false },
        { name: "Actifs", isActive: false },
        { name: "Rejetés", isActive: false },
        { name: "Supprimés", isActive: false },
        { name: "Expirés", isActive: false },
    ]);

    const [selectedMatch, setSelectedMatch] =
        useState<EnrichedMatchLiveSummaryDTO | null>(null);

    const historySheetRef = useRef<BottomSheetModal>(null);

    const matches: EnrichedMatchLiveSummaryDTO[] = useMemo(
        () => data ?? [],
        [data],
    );

    const activeStatusFilterName =
        statusFilters.find((f) => f.isActive)?.name ?? "";

    const activeStatusEnum: LiveLinkStatus | null = useMemo(() => {
        switch (activeStatusFilterName) {
            case "En attente":
                return "PENDING";
            case "Actifs":
                return "ACTIVE";
            case "Rejetés":
                return "REJECTED";
            case "Supprimés":
                return "HIDDEN";
            case "Expirés":
                return "EXPIRED";
            default:
                return null;
        }
    }, [activeStatusFilterName]);

    const filteredMatches = useMemo(() => {
        return matches.filter((m) => {
            const teamALabel = m.teamA.shortName ?? m.teamA.name ?? "";
            const teamBLabel = m.teamB.shortName ?? m.teamB.name ?? "";
            const searchTarget = `${teamALabel} vs ${teamBLabel}`.toLowerCase();

            const matchSearch =
                search.trim().length === 0 ||
                searchTarget.includes(search.toLowerCase());

            const matchStatus =
                !activeStatusEnum || m.lastLiveLinkStatus === activeStatusEnum;

            return matchSearch && matchStatus;
        });
    }, [matches, search, activeStatusEnum]);

    const sortedMatches = useMemo(() => {
        return [...filteredMatches].sort((a, b) => {
            if (!a.matchDate || !b.matchDate) return 0;
            const da = new Date(a.matchDate).getTime();
            const db = new Date(b.matchDate).getTime();
            return db - da;
        });
    }, [filteredMatches]);

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

                <View style={styles.filtersWrapper}>
                    <Filters
                        filters={statusFilters}
                        setFilters={setStatusFilters}
                        singleSelect
                    />
                </View>

                <FlashList
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
                message={apiError || (isError ? "Erreur lors du chargement." : null)}
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
        gap: 12,
    },
    filtersWrapper: {
        paddingHorizontal: 8,
        paddingTop: 6,
    },
});