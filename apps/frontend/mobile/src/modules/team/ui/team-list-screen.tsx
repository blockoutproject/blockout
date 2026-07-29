import React, { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, useAppTheme } from "@/src/shared/theme";

import ErrorState from "@/src/shared/ui/feedback/error-state";
import TeamCard from "@/src/modules/team/ui/team-list-card";
import TeamListHeader from "@/src/modules/team/ui/team-list-header";
import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";
import { ReportTypeEnum } from "@/src/shared/generated/models";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import { useTeamListByClubId } from "@/src/modules/team/hooks/use-team-list-by-club-id";
import EntityListSkeleton from "@/src/shared/ui/entity/entity-list-skeleton";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import SeasonSelect from "@/src/shared/ui/form/season-select";
import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";
import { useSeasonFilter } from "@/src/shared/hooks/use-season-filter";

const TeamListScreen: React.FC = () => {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clubId } = useLocalSearchParams();
  const { handleNavigationWithAd } = useNavigationInterstitial();

  const { data, isLoading, isError, refetch } = useTeamListByClubId(
    String(clubId),
  );

  const [refreshing, setRefreshing] = useState(false);

  const reportSheetRef = useRef<BottomSheetModal>(null);

  const handleOpenReport = useCallback(() => {
    reportSheetRef.current?.present();
  }, []);

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: TeamSummaryResponse }) => (
      <TeamCard
        team={item}
        onPress={() => handleTeamPress(item.id)}
        testID={`team-list-item-${item.id}`}
      />
    ),
    [handleTeamPress],
  );

  const {
    availableSeasons,
    selectedSeason,
    setSelectedSeason,
    filteredItems: filteredData,
  } = useSeasonFilter(data);

  const seasonOptions: SelectOption<string>[] = useMemo(
    () => availableSeasons.map((s) => ({ value: s, label: s })),
    [availableSeasons],
  );

  const hasData = filteredData.length > 0;
  let content: React.ReactNode;
  if (isLoading && !refreshing) {
    content = <EntityListSkeleton testID="team-list-loading" />;
  } else if (isError) {
    content = (
      <ErrorState
        subtitle="Impossible de charger les équipes."
        onRetry={refetch}
        paddingTop="40%"
        testID="team-list-error"
        retryTestID="team-list-retry-action"
      />
    );
  } else if (!hasData) {
    content = (
      <ErrorState
        subtitle="Aucune équipe trouvée pour ce club."
        onRetry={refetch}
        paddingTop="30%"
        testID="team-list-empty"
        retryTestID="team-list-empty-retry-action"
      />
    );
  } else {
    content = (
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingBottom: insets.bottom + layout.bottomNavigation,
        }}
        scrollEnabled
        testID="team-list"
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      testID="team-list-screen"
    >
      <TeamListHeader
        title="Équipes"
        onOpenReport={handleOpenReport}
        rightAddon={
          availableSeasons.length > 0 ? (
            <SeasonSelect
              options={seasonOptions}
              selectedValue={selectedSeason}
              onValueChange={setSelectedSeason}
              testID="team-list-season-button"
            />
          ) : null
        }
      />

      {content}

      <ReportFormSheet
        ref={reportSheetRef}
        context={{
          screen: `TeamList#${clubId}`,
          defaultType: ReportTypeEnum.DISPLAY_BUG,
        }}
        onSuccess={() => {
          reportSheetRef.current?.dismiss();
        }}
        snapPoint="90%"
        footerLabel="Envoyer"
      />
    </View>
  );
};

export default TeamListScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
