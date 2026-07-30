import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatchStatusEnum } from "@/src/shared/generated/models";
import { layout, useAppTheme } from "@/src/shared/theme";
import { useMatchList } from "@/src/modules/match/hooks/use-match-list";
import {
  buildMatchListRows,
  getMatchListRowKey,
  type MatchListRow,
} from "@/src/modules/match/view-models/match-list-rows";
import MatchDateHeader from "./match-date-header";
import MatchPoolSection from "./match-pool-section";
import EmptyState from "@/src/shared/ui/feedback/empty-state";
import ErrorState from "@/src/shared/ui/feedback/error-state";

import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";

export type MatchListProps = {
  poolIds?: number[];
  teamIds?: number[];
  status: MatchStatusEnum;
  scrollY: Animated.Value;
  contentContainerStyle?: StyleProp<ViewStyle>;
  headerOffset: number;
  showPoolHeader?: boolean;
  home?: boolean;
};

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList<MatchListRow>,
);

const MatchList: React.FC<MatchListProps> = ({
  poolIds,
  teamIds,
  status,
  scrollY,
  contentContainerStyle,
  headerOffset,
  showPoolHeader = true,
  home = false,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    dayMatches,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useMatchList(status, poolIds, teamIds);

  const { handleNavigationWithAd } = useAdvertising();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    );
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMatchPress = useCallback(
    async (matchId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/match/${matchId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  const flatData = useMemo(() => buildMatchListRows(dayMatches), [dayMatches]);

  useEffect(() => {
    scrollY.setValue(0);
  }, [scrollY, poolIds, teamIds]);

  const onRetry = useCallback(() => {
    scrollY.setValue(0);
    refetch();
  }, [scrollY, refetch]);

  const getItemType = useCallback((item: MatchListRow) => item.type, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MatchListRow>) => {
      switch (item.type) {
        case "sectionHeader":
          return <MatchDateHeader title={item.title} />;
        case "pool":
          return (
            <MatchPoolSection
              poolMatches={item.pool}
              handleMatchPress={handleMatchPress}
              showHeader={showPoolHeader}
            />
          );
        default:
          return null;
      }
    },
    [handleMatchPress, showPoolHeader],
  );

  const header = useMemo(
    () => <View style={{ height: headerOffset + 4 }} />,
    [headerOffset],
  );

  const footer = useMemo(() => {
    const footerBase = (
      <View style={{ height: insets.bottom + layout.bottomNavigation + 4 }} />
    );

    if (isFetchingNextPage && hasNextPage) {
      return (
        <View>
          <ActivityIndicator
            style={{ marginBottom: layout.sectionSeparator }}
          />
          {footerBase}
        </View>
      );
    }

    return footerBase;
  }, [isFetchingNextPage, hasNextPage, insets]);

  const empty = useMemo(
    () => (
      <EmptyState
        title="Aucun match trouvé"
        onRetry={poolIds?.length || teamIds?.length ? refetch : undefined}
        retryLabel={
          poolIds?.length || teamIds?.length ? "Réessayer" : undefined
        }
        subtitle={
          poolIds?.length || teamIds?.length
            ? "Aucun match trouvé pour les équipes ou poules sélectionnées."
            : "Commence par suivre une équipe ou une poule pour voir les matchs ici !"
        }
        paddingTop={home ? "30%" : "10%"}
        testID="match-list-empty"
        retryTestID="match-list-empty-retry-action"
      />
    ),
    [home, poolIds?.length, refetch, teamIds?.length],
  );

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <View
        style={[styles.center, { backgroundColor: theme.background }]}
        testID="match-list-loading"
      >
        <ActivityIndicator
          accessibilityLabel="Chargement des matchs"
          size="large"
          color={theme.text}
        />
      </View>
    );
  } else if (isError) {
    body = (
      <ErrorState
        subtitle="Impossible de charger les matchs."
        onRetry={onRetry}
        paddingTop={home ? "60%" : "30%"}
        testID="match-list-error"
        retryTestID="match-list-retry-action"
      />
    );
  } else {
    body = (
      <AnimatedFlashList
        data={flatData}
        renderItem={renderItem}
        getItemType={getItemType}
        keyExtractor={getMatchListRowKey}
        onEndReached={handleLoadMore}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        progressViewOffset={headerOffset}
        contentContainerStyle={contentContainerStyle}
        alwaysBounceVertical
        bounces
        onScroll={
          scrollY
            ? Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                {
                  useNativeDriver: true,
                },
              )
            : undefined
        }
        scrollEventThrottle={16}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        testID="match-list"
      />
    );
  }

  return body;
};

export default MatchList;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
