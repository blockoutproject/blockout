import React, { useCallback, useMemo, useState } from "react";
import { Animated, Keyboard, View } from "react-native";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, spacing } from "@/src/shared/theme";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import EntityListSkeleton from "@/src/shared/ui/entity/entity-list-skeleton";
import EmptyState from "@/src/shared/ui/feedback/empty-state";

import TeamCard from "@/src/modules/team/ui/team-list-card";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import { useNavigationInterstitial } from "@/src/modules/advertising/use-navigation-interstitial";

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
      <View style={{ height: insets.bottom + layout.bottomNavigation + 12 }} />
    ),
    [insets.bottom],
  );

  const ListHeaderComponent = useMemo(
    () => <View style={{ height: layout.tabs + 12 }} />,
    [],
  );

  const hasData = teams.length > 0;
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TeamSummaryResponse>) => (
      <TeamCard
        team={item}
        onPress={() => handleTeamPress(item.id)}
        testID={`club-team-item-${item.id}`}
      />
    ),
    [handleTeamPress],
  );

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
    <FlashList
      data={teams}
      keyExtractor={(item: TeamSummaryResponse) => String(item.id)}
      renderItem={renderItem}
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
      contentContainerStyle={{ paddingHorizontal: spacing[2] }}
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
