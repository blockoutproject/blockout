import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useFollowedPoolList } from "@/src/modules/pool/hooks/use-followed-pool-list";
import PoolListCard from "@/src/modules/pool/ui/pool-list-card";
import { spacing } from "@/src/shared/theme";
import RemoteEntityList, {
  type RemoteEntityListFeedback,
} from "@/src/shared/ui/entity/remote-entity-list";
import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";
import type { PoolSummaryResponse } from "@/src/shared/generated/models";

type Props = {
  poolIds?: number[];
  selectedSeason?: string;
  onSeasonsChange?: (seasons: string[]) => void;
};

const feedback = {
  loadingTestID: "followed-pool-loading",
  error: {
    subtitle: "Impossible de charger vos poules suivies.",
    paddingTop: "15%",
    testID: "followed-pool-error",
    retryTestID: "followed-pool-retry-action",
  },
  empty: {
    title: "C'est calme par ici ...",
    subtitle: "Commence par suivre une poule pour la retrouver ici !",
    retryLabel: "Réessayer",
    paddingTop: "10%",
    testID: "followed-pool-empty",
    retryTestID: "followed-pool-empty-retry-action",
  },
} satisfies RemoteEntityListFeedback;

const FollowedPoolsList: React.FC<Props> = ({
  poolIds,
  selectedSeason,
  onSeasonsChange,
}) => {
  const router = useRouter();
  const { handleNavigationWithAd } = useAdvertising();

  const { pools, isLoading, isError, refetch } = useFollowedPoolList(poolIds);

  const handlePoolPress = useCallback(
    async (poolId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/pool/${poolId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  useEffect(() => {
    const seasons = Array.from(
      new Set(
        pools
          .map((pool) => pool.season)
          .filter((season): season is string => Boolean(season)),
      ),
    ).sort((a, b) => b.localeCompare(a));

    onSeasonsChange?.(seasons);
  }, [pools, onSeasonsChange]);

  const data = useMemo(() => {
    if (!selectedSeason) return pools;
    return pools.filter((pool) => pool.season === selectedSeason);
  }, [pools, selectedSeason]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PoolSummaryResponse>) => (
      <PoolListCard
        pool={item}
        onPress={() => handlePoolPress(item.id)}
        testID={`followed-pool-item-${item.id}`}
      />
    ),
    [handlePoolPress],
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
      testID="followed-pool-list"
    />
  );
};

export default FollowedPoolsList;

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing[1],
  },
});
