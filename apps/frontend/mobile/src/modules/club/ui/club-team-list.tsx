import React, { useCallback, useMemo } from "react";
import { Animated, Keyboard, StyleSheet, View } from "react-native";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { layout, spacing } from "@/src/shared/theme";
import RemoteEntityList, {
  type RemoteEntityListFeedback,
} from "@/src/shared/ui/entity/remote-entity-list";

import TeamCard from "@/src/modules/team/ui/team-list-card";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";

type Props = {
  teams: TeamSummaryResponse[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => Promise<unknown>;
  scrollY: Animated.Value;
};

const feedback = {
  loadingTestID: "club-team-loading",
  error: {
    subtitle: "Impossible de charger les équipes du club.",
    paddingTop: "15%",
    testID: "club-team-error",
    retryTestID: "club-team-retry-action",
  },
  empty: {
    title: "Aucune équipe",
    subtitle: "Ce club n'a aucune équipe pour la saison sélectionnée.",
    retryLabel: "Réessayer",
    paddingTop: "10%",
    testID: "club-team-empty",
    retryTestID: "club-team-empty-retry-action",
  },
} satisfies RemoteEntityListFeedback;

const ClubTeamList: React.FC<Props> = ({
  teams,
  isLoading,
  isError,
  onRefresh,
  scrollY,
}) => {
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();
      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [handleNavigationWithAd, router],
  );

  const ListHeaderComponent = useMemo(
    () => <View style={{ height: layout.tabs + 12 }} />,
    [],
  );

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

  return (
    <RemoteEntityList
      data={teams}
      feedback={feedback}
      footerSpacing={spacing[3]}
      isLoading={isLoading}
      isError={isError}
      onRefresh={onRefresh}
      keyExtractor={(item: TeamSummaryResponse) => String(item.id)}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
          useNativeDriver: false,
        },
      )}
      testID="club-team-list"
    />
  );
};

export default ClubTeamList;

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing[2],
  },
});
