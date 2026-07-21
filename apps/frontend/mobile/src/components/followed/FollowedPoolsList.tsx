import React, {useCallback, useEffect, useMemo, useState,} from "react";
import {FlatList, View,} from "react-native";
import * as Haptics from "expo-haptics";
import {useRouter} from "expo-router";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useFollowedPoolList} from "@/src/hooks/pool/useFollowedPoolList";
import FollowedPoolCard from "./FollowedPoolCard";
import {BOTTOM_TABBAR_HEIGHT} from "@/src/shared/theme/tokens";
import EmptyState from "@/src/shared/ui/feedback/EmptyState";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import FollowedListSkeleton from "./FollowedListSkeleton";
import {useNavigationInterstitial} from "@/src/hooks/ads/useNavigationInterstitial";

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
  const {handleNavigationWithAd} = useNavigationInterstitial();

  const {pools, isLoading, isError, refetch} =
    useFollowedPoolList(poolIds);

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
    [router, handleNavigationWithAd]
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

  useEffect(() => {
    const all = pools ?? [];
    const seasons = Array.from(
      new Set(
        all
          .map((p: any) => p.season)
          .filter((s: unknown): s is string => !!s),
      ),
    ).sort((a, b) => b.localeCompare(a));

    onSeasonsChange?.(seasons);
  }, [pools, onSeasonsChange]);

  const allData = pools ?? [];
  const data = useMemo(() => {
    if (!selectedSeason) return allData;
    return allData.filter((p: any) => p.season === selectedSeason);
  }, [allData, selectedSeason]);

  const hasData = data.length > 0;

  if (isLoading) {
    return <FollowedListSkeleton/>;
  }

  if (isError) {
    return (
      <ErrorState
        subtitle="Impossible de charger vos poules suivies."
        onRetry={refetch}
        paddingTop="15%"
      />
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({item}) => (
        <FollowedPoolCard
          pool={item}
          onPress={() => handlePoolPress(item.id)}
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
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 4}}
      alwaysBounceVertical
      scrollEventThrottle={16}
      scrollEnabled={hasData}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      testID="followed-pools-flatlist"
    />
  );
};

export default FollowedPoolsList;
