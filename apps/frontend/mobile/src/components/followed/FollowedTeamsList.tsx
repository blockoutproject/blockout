import React, {useCallback, useEffect, useMemo, useState,} from "react";
import {FlatList, View,} from "react-native";
import * as Haptics from "expo-haptics";
import {useRouter} from "expo-router";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useFollowedTeamList} from "@/src/hooks/team/useFollowedTeamList";
import FollowedTeamCard from "./FollowedTeamCard";
import {BOTTOM_TABBAR_HEIGHT} from "@/src/theme/globals";
import EmptyState from "@/src/components/common/feedback/EmptyState";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import FollowedListSkeleton from "./FollowedListSkeleton";
import {useNavigationInterstitial} from "@/src/hooks/ads/useNavigationInterstitial";

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
  const {handleNavigationWithAd} = useNavigationInterstitial();

  const {teams, isLoading, isError, refetch} =
    useFollowedTeamList(teamIds);

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

  // 🔁 Extraction des saisons disponibles à partir des équipes suivies
  useEffect(() => {
    const all = teams ?? [];
    const seasons = Array.from(
      new Set(
        all
          .map((t: any) => t.season)
          .filter((s: unknown): s is string => !!s),
      ),
    ).sort((a, b) => b.localeCompare(a));

    onSeasonsChange?.(seasons);
  }, [teams, onSeasonsChange]);

  const allData = teams ?? [];
  const data = useMemo(() => {
    if (!selectedSeason) return allData;
    return allData.filter((t: any) => t.season === selectedSeason);
  }, [allData, selectedSeason]);

  const hasData = data.length > 0;

  if (isLoading) {
    return <FollowedListSkeleton/>;
  }

  if (isError) {
    return (
      <ErrorState
        subtitle="Impossible de charger vos équipes suivies."
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
        <FollowedTeamCard
          team={item}
          onPress={() => handleTeamPress(item.id)}
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
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 4}}
      alwaysBounceVertical
      scrollEventThrottle={16}
      scrollEnabled={hasData}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      testID="followed-teams-flatlist"
    />
  );
};

export default FollowedTeamsList;
