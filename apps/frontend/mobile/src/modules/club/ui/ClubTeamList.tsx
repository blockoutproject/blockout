import React, { useCallback, useMemo, useState } from "react";
import { Animated, FlatList, Keyboard, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BOTTOM_TABBAR_HEIGHT, TABBAR_HEIGHT } from "@/src/shared/theme/tokens";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import EntityListSkeleton from "@/src/shared/ui/entity/EntityListSkeleton";
import EmptyState from "@/src/shared/ui/feedback/EmptyState";

import TeamCard from "@/src/modules/team/ui/TeamListCard";
import type { TeamSummaryResponse } from "@/src/modules/team/model/Team";
import { useNavigationInterstitial } from "@/src/modules/advertising/useNavigationInterstitial";

type Props = {
  teams: TeamSummaryResponse[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => Promise<unknown>;
  scrollY: Animated.Value;
};

const ClubTeamList: React.FC<Props> = ({
  teams,
  isLoading,
  isError,
  onRefresh,
  scrollY,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();
      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [handleNavigationWithAd, router],
  );

  const ListFooterComponent = useMemo(
    () => (
      <View style={{ height: insets.bottom + BOTTOM_TABBAR_HEIGHT + 12 }} />
    ),
    [insets.bottom],
  );

  const ListHeaderComponent = useMemo(
    () => <View style={{ height: TABBAR_HEIGHT + 12 }} />,
    [],
  );

  const hasData = teams.length > 0;

  if (isLoading && !isRefreshing)
    return <EntityListSkeleton testID="club-team-loading" />;

  if (isError) {
    return (
      <ErrorState
        subtitle="Impossible de charger les équipes du club."
        onRetry={handleRefresh}
        paddingTop="15%"
        testID="club-team-error"
        retryTestID="club-team-retry-action"
      />
    );
  }

  return (
    <FlatList
      data={teams}
      keyExtractor={(item: TeamSummaryResponse) => String(item.id)}
      renderItem={({ item }) => (
        <TeamCard
          team={item}
          onPress={() => handleTeamPress(item.id)}
          testID={`club-team-item-${item.id}`}
        />
      )}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={() => (
        <EmptyState
          title="Aucune équipe"
          subtitle="Ce club n'a aucune équipe pour la saison sélectionnée."
          onRetry={handleRefresh}
          retryLabel="Réessayer"
          paddingTop="10%"
          testID="club-team-empty"
          retryTestID="club-team-empty-retry-action"
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8 }}
      alwaysBounceVertical
      scrollEnabled={hasData}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
          useNativeDriver: false,
        },
      )}
      scrollEventThrottle={16}
      testID="club-team-list"
    />
  );
};

export default ClubTeamList;
