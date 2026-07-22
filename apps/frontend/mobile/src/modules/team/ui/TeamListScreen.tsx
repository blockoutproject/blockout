import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FlatList, Keyboard, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/shared/theme/tokens";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import TeamCard from "@/src/modules/team/ui/TeamListCard";
import TeamListHeader from "@/src/modules/team/ui/TeamListHeader";
import ReportFormSheet from "@/src/modules/report/ui/ReportFormSheet";
import { ReportTypeEnum } from "@/src/shared/generated/models";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import { useTeamListByClubId } from "@/src/modules/team/hooks/useTeamListByClubId";
import EntityListSkeleton from "@/src/shared/ui/entity/EntityListSkeleton";
import { SelectOption } from "@/src/shared/ui/form/SelectSheet";
import SeasonSelect from "@/src/shared/ui/form/SeasonSelect";
import { useNavigationInterstitial } from "@/src/modules/advertising/useNavigationInterstitial";

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

  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

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

  useEffect(() => {
    const allTeams = data ?? [];
    const seasons = Array.from(
      new Set(allTeams.map((t) => t.season).filter((s): s is string => !!s)),
    ).sort((a, b) => b.localeCompare(a));

    setAvailableSeasons(seasons);

    if (seasons.length === 0) {
      setSelectedSeason(null);
    } else if (!selectedSeason || !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [data, selectedSeason]);

  const seasonOptions: SelectOption[] = useMemo(
    () => availableSeasons.map((s) => ({ value: s, label: s })),
    [availableSeasons],
  );

  const filteredData: TeamSummaryResponse[] = useMemo(() => {
    const all = data ?? [];
    if (!selectedSeason) return all;
    return all.filter((t) => t.season === selectedSeason);
  }, [data, selectedSeason]);

  const hasData = filteredData.length > 0;

  const body = useMemo(() => {
    if (isLoading && !refreshing) {
      return <EntityListSkeleton testID="team-list-loading" />;
    }

    if (isError) {
      return (
        <ErrorState
          subtitle="Impossible de charger les équipes."
          onRetry={refetch}
          paddingTop={"40%"}
          testID="team-list-error"
          retryTestID="team-list-retry-action"
        />
      );
    }

    if (!filteredData || filteredData.length === 0) {
      return (
        <ErrorState
          subtitle="Aucune équipe trouvée pour ce club."
          onRetry={refetch}
          paddingTop={"30%"}
          testID="team-list-empty"
          retryTestID="team-list-empty-retry-action"
        />
      );
    }

    return (
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT,
        }}
        scrollEnabled={hasData}
        testID="team-list"
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  }, [
    isLoading,
    isError,
    filteredData,
    refetch,
    renderItem,
    insets.bottom,
    refreshing,
    onRefresh,
    hasData,
  ]);

  const handleSelectSeason = useCallback((opt: SelectOption) => {
    setSelectedSeason(String(opt.value));
  }, []);

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
              onSelect={handleSelectSeason}
              testIDButton="team-list-season-button"
            />
          ) : null
        }
      />

      {body}

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
