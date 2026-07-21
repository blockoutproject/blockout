import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFollowedTeamList } from "@/src/modules/team/hooks/useFollowedTeamList";
import TeamListCard from "@/src/modules/team/ui/TeamListCard";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/shared/theme/tokens";
import EmptyState from "@/src/shared/ui/feedback/EmptyState";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import EntityListSkeleton from "@/src/shared/ui/entity/EntityListSkeleton";
import { useNavigationInterstitial } from "@/src/modules/advertising/useNavigationInterstitial";

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
          height: insets.bottom + BOTTOM_TABBAR_HEIGHT + 4,
        }}
      />
    ),
    [insets.bottom],
  );

  // 🔁 Extraction des saisons disponibles à partir des équipes suivies
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
    <FlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TeamListCard
          team={item}
          onPress={() => handleTeamPress(item.id)}
          testID={`followed-team-item-${item.id}`}
        />
      )}
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
      contentContainerStyle={{ paddingHorizontal: 4 }}
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
