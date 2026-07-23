import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFollowedPoolList } from "@/src/modules/pool/hooks/useFollowedPoolList";
import PoolListCard from "@/src/modules/pool/ui/PoolListCard";
import {layout} from "@/src/shared/theme";
import EmptyState from "@/src/shared/ui/feedback/EmptyState";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import EntityListSkeleton from "@/src/shared/ui/entity/EntityListSkeleton";
import { useNavigationInterstitial } from "@/src/modules/advertising/useNavigationInterstitial";

type Props = {
  poolIds?: number[];
  selectedSeason?: string;
  onSeasonsChange?: (seasons: string[]) => void;
};

const FollowedPoolsList: React.FC<Props> = ({
  poolIds,
  selectedSeason,
  onSeasonsChange,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();

  const { pools, isLoading, isError, refetch } = useFollowedPoolList(poolIds);

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

  const handlePoolPress = useCallback(
    async (poolId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/pool/${poolId}`);
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

  const hasData = data.length > 0;

  if (isLoading) {
    return <EntityListSkeleton testID="followed-pool-loading" />;
  }

  if (isError) {
    return (
      <ErrorState
        subtitle="Impossible de charger vos poules suivies."
        onRetry={refetch}
        paddingTop="15%"
        testID="followed-pool-error"
        retryTestID="followed-pool-retry-action"
      />
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <PoolListCard
          pool={item}
          onPress={() => handlePoolPress(item.id)}
          testID={`followed-pool-item-${item.id}`}
        />
      )}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={() => (
        <EmptyState
          title="C'est calme par ici ..."
          subtitle="Commence par suivre une poule pour la retrouver ici !"
          onRetry={refetch}
          retryLabel="Réessayer"
          paddingTop="10%"
          testID="followed-pool-empty"
          retryTestID="followed-pool-empty-retry-action"
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4 }}
      alwaysBounceVertical
      scrollEventThrottle={16}
      scrollEnabled={hasData}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      testID="followed-pool-list"
    />
  );
};

export default FollowedPoolsList;
