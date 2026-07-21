import React, {useCallback, useMemo, useState} from "react";
import {Animated, FlatList, Keyboard, View} from "react-native";
import * as Haptics from "expo-haptics";
import {useRouter} from "expo-router";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {BOTTOM_TABBAR_HEIGHT, TABBAR_HEIGHT} from "@/src/theme/globals";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import FollowedListSkeleton from "@/src/components/followed/FollowedListSkeleton";
import EmptyState from "@/src/components/common/feedback/EmptyState";

import TeamCard from "@/src/components/teamList/TeamListCard";
import {TeamSummaryDTO} from "@/src/types/Team";
import {useNavigationInterstitial} from "@/src/hooks/ads/useNavigationInterstitial";

type Props = {
  clubId: string;
  teams: TeamSummaryDTO[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => Promise<any>;
  scrollY: Animated.Value;
};

const ClubTeamList: React.FC<Props> = ({teams, isLoading, isError, onRefresh, scrollY}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {handleNavigationWithAd} = useNavigationInterstitial();

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
    [handleNavigationWithAd, router]
  );

  const ListFooterComponent = useMemo(
    () => <View style={{height: insets.bottom + BOTTOM_TABBAR_HEIGHT + 12}}/>,
    [insets.bottom]
  );

  const ListHeaderComponent = useMemo(
    () => <View style={{height: TABBAR_HEIGHT + 12}}/>,
    []
  );

  const hasData = teams.length > 0;

  if (isLoading && !isRefreshing) return <FollowedListSkeleton/>;

  if (isError) {
    return (
      <ErrorState
        subtitle="Impossible de charger les équipes du club."
        onRetry={handleRefresh}
        paddingTop="15%"
      />
    );
  }

  return (
    <FlatList
      data={teams}
      keyExtractor={(item: TeamSummaryDTO) => String(item.id)}
      renderItem={({item}) => (
        <TeamCard
          team={item}
          onPress={() => handleTeamPress(item.id)}
          testID={`club-team-card-${item.id}`}
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
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 8}}
      alwaysBounceVertical
      scrollEnabled={hasData}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
      onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
        useNativeDriver: false,
      })}
      scrollEventThrottle={16}
      testID="club-teams-flatlist"
    />
  );
};

export default ClubTeamList;
