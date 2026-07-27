import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFollowedTeamList } from "@/src/modules/team/hooks/use-followed-team-list";
import TeamListCard from "@/src/modules/team/ui/team-list-card";
import { layout, spacing } from "@/src/shared/theme";
import EmptyState from "@/src/shared/ui/feedback/empty-state";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import EntityListSkeleton from "@/src/shared/ui/entity/entity-list-skeleton";
import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";

type Props = {
  teamIds?: number[];
  selectedSeason?: string;
  onSeasonsChange?: (seasons: string[]) => void;
};

const FollowedTeamsList: React.FC<Props> = ({
  teamIds,
  selectedSeason,
  onSeasonsChange,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();

  const { teams, isLoading, isError, refetch } = useFollowedTeamList(teamIds);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await refetch?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  const ListFooterComponent = useMemo(
    () => (
      <View
        style={{
          height: insets.bottom + layout.bottomNavigation + 4,
        }}
      />
    ),
    [insets.bottom],
  );

  useEffect(() => {
    const seasons = Array.from(
      new Set(
        teams
          .map((team) => team.season)
          .filter((season): season is string => Boolean(season)),
      ),
    ).sort((a, b) => b.localeCompare(a));

    onSeasonsChange?.(seasons);
  }, [teams, onSeasonsChange]);

  const data = useMemo(() => {
    if (!selectedSeason) return teams;
    return teams.filter((team) => team.season === selectedSeason);
  }, [teams, selectedSeason]);

  const hasData = data.length > 0;
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TeamSummaryResponse>) => (
      <TeamListCard
        team={item}
        onPress={() => handleTeamPress(item.id)}
        testID={`followed-team-item-${item.id}`}
      />
    ),
    [handleTeamPress],
  );

  if (isLoading) {
    return <EntityListSkeleton testID="followed-team-loading" />;
  }

  if (isError) {
    return (
      <ErrorState
        subtitle="Impossible de charger vos équipes suivies."
        onRetry={refetch}
        paddingTop="15%"
        testID="followed-team-error"
        retryTestID="followed-team-retry-action"
      />
    );
  }

  return (
    <FlashList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={() => (
        <EmptyState
          title="Aucune équipe suivie"
          subtitle="Commence par suivre une équipe pour la retrouver ici !"
          onRetry={refetch}
          retryLabel="Réessayer"
          paddingTop="10%"
          testID="followed-team-empty"
          retryTestID="followed-team-empty-retry-action"
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing[1] }}
      alwaysBounceVertical
      scrollEventThrottle={16}
      scrollEnabled={hasData}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      testID="followed-team-list"
    />
  );
};

export default FollowedTeamsList;
