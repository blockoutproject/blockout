import React, { useCallback, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { spacing, useAppTheme } from "@/src/shared/theme";
import { useLiveModerationMatches } from "@/src/modules/match/hooks/use-live-moderation-matches";
import {
  MatchLiveSummaryResponse,
  LiveLinkStatusEnum,
} from "@/src/shared/generated/models";
import { Filter } from "@/src/shared/view-models/filter";

import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";
import { SearchField } from "@/src/shared/ui/search-field";
import Filters from "@/src/shared/ui/filters";
import MatchLiveModerationItem from "@/src/modules/match/ui/moderation/match-live-moderation-item";
import BottomSheetCustomPage from "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-page";
import MatchLiveLinksHistoryScreen from "./match-live-links-history-screen";
import RemoteEntityList, {
  type RemoteEntityListFeedback,
} from "@/src/shared/ui/entity/remote-entity-list";
import { filterAndSortModerationMatches } from "@/src/modules/match/view-models/live-link-moderation";

const STATUS_FILTERS: Filter[] = [
  { name: "En attente", isActive: false },
  { name: "Actifs", isActive: false },
  { name: "Rejetés", isActive: false },
  { name: "Désactivés", isActive: false },
  { name: "Bannis", isActive: false },
  { name: "Expirés", isActive: false },
];

const FILTER_NAME_TO_STATUS: Record<string, LiveLinkStatusEnum | null> = {
  "En attente": "PENDING",
  Actifs: "ACTIVE",
  Rejetés: "REJECTED",
  Désactivés: "DEACTIVATED",
  Bannis: "BANNED",
  Expirés: "EXPIRED",
};

const EMPTY_MATCHES: MatchLiveSummaryResponse[] = [];
const getModerationMatchKey = (item: MatchLiveSummaryResponse) =>
  String(item.id);

const MODERATION_LIST_FEEDBACK = {
  loadingTestID: "match-moderation-loading",
  error: {
    subtitle: "Impossible de charger les matchs à modérer.",
    testID: "match-moderation-error",
    retryTestID: "match-moderation-retry-action",
  },
  empty: {
    title: "Aucun match à modérer",
    subtitle: "Aucun match à modérer pour le moment.",
    testID: "match-moderation-empty",
    retryTestID: "match-moderation-empty-retry-action",
  },
} satisfies RemoteEntityListFeedback;

const MatchLiveModerationScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<Filter[]>(STATUS_FILTERS);

  const [selectedMatch, setSelectedMatch] =
    useState<MatchLiveSummaryResponse | null>(null);

  const historySheetRef = useRef<BottomSheetModal>(null);

  const activeStatusName = statusFilters.find((f) => f.isActive)?.name ?? "";
  const activeStatus = useMemo<LiveLinkStatusEnum | null>(
    () => FILTER_NAME_TO_STATUS[activeStatusName] ?? null,
    [activeStatusName],
  );

  const { data, isLoading, refetch, isError } =
    useLiveModerationMatches(activeStatus);

  const matches = data ?? EMPTY_MATCHES;

  const sortedMatches = useMemo(
    () => filterAndSortModerationMatches(matches, search),
    [matches, search],
  );

  const handleRefresh = useCallback(async () => {
    setApiError(null);
    await refetch();
  }, [refetch]);

  const handlePressMatch = useCallback((match: MatchLiveSummaryResponse) => {
    setSelectedMatch(match);
    historySheetRef.current?.present();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MatchLiveSummaryResponse }) => (
      <MatchLiveModerationItem match={item} onPress={handlePressMatch} />
    ),
    [handlePressMatch],
  );

  return (
    <>
      <View
        style={[styles.container, { backgroundColor: theme.background }]}
        testID="match-moderation-screen"
      >
        <View style={styles.searchRow}>
          <SearchField
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

        <RemoteEntityList
          data={sortedMatches}
          feedback={MODERATION_LIST_FEEDBACK}
          footerSpacing={16}
          includeBottomNavigationSpacing={false}
          isError={false}
          isLoading={Boolean(isLoading && !data)}
          keyExtractor={getModerationMatchKey}
          onRefresh={handleRefresh}
          refreshHapticStyle={Haptics.ImpactFeedbackStyle.Light}
          renderItem={renderItem}
          onScrollBeginDrag={Keyboard.dismiss}
          scrollWhenEmpty
          showEmptyRetry={false}
          testID="match-moderation-list"
        />
      </View>

      <ApiErrorToast
        bottomOffset={insets.bottom}
        message={apiError || (isError ? "Erreur lors du chargement." : null)}
        onHidden={() => setApiError(null)}
      />

      <BottomSheetCustomPage ref={historySheetRef}>
        {!!selectedMatch && (
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
  searchRow: {
    marginHorizontal: spacing[2],
    marginTop: spacing[2],
  },
  filtersRow: {
    paddingHorizontal: spacing[2],
    paddingTop: spacing.tight,
  },
});
