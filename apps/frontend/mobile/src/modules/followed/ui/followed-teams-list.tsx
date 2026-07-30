import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useFollowedTeamList } from "@/src/modules/team/hooks/use-followed-team-list";
import TeamListCard from "@/src/modules/team/ui/team-list-card";
import { spacing } from "@/src/shared/theme";
import RemoteEntityList, {
  type RemoteEntityListFeedback,
} from "@/src/shared/ui/entity/remote-entity-list";
import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";

type Props = {
  teamIds?: number[];
  selectedSeason?: string;
  onSeasonsChange?: (seasons: string[]) => void;
};

const feedback = {
  loadingTestID: "followed-team-loading",
  error: {
    subtitle: "Impossible de charger vos équipes suivies.",
    paddingTop: "15%",
    testID: "followed-team-error",
    retryTestID: "followed-team-retry-action",
  },
  empty: {
    title: "Aucune équipe suivie",
    subtitle: "Commence par suivre une équipe pour la retrouver ici !",
    retryLabel: "Réessayer",
    paddingTop: "10%",
    testID: "followed-team-empty",
    retryTestID: "followed-team-empty-retry-action",
  },
} satisfies RemoteEntityListFeedback;

const FollowedTeamsList: React.FC<Props> = ({
  teamIds,
  selectedSeason,
  onSeasonsChange,
}) => {
  const router = useRouter();
  const { handleNavigationWithAd } = useAdvertising();

  const { teams, isLoading, isError, refetch } = useFollowedTeamList(teamIds);

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd],
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

  return (
    <RemoteEntityList
      data={data}
      feedback={feedback}
      footerSpacing={spacing[1]}
      isLoading={isLoading}
      isError={isError}
      onRefresh={refetch}
      onRetry={refetch}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      testID="followed-team-list"
    />
  );
};

export default FollowedTeamsList;

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing[1],
  },
});
