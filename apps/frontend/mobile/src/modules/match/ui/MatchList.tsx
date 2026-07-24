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

import {
  DayMatchesResponse,
  PoolMatchesResponse,
  MatchStatusEnum,
} from "@/src/shared/generated/models";
import { layout, useAppTheme } from "@/src/shared/theme";
import { useMatchList } from "@/src/modules/match/hooks/useMatchList";
import { formatDateFrenchLocale } from "@/src/shared/lib/utils";
import MatchDateHeader from "./match-date-header";
import MatchPoolSection from "./match-pool-section";
import EmptyState from "@/src/shared/ui/feedback/EmptyState";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";

import { useNavigationInterstitial } from "@/src/modules/advertising/useNavigationInterstitial";

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

type HeaderRow = { type: "sectionHeader"; title: string; sectionKey: string };
type PoolRow = { type: "pool"; pool: PoolMatchesResponse; sectionKey: string };
type Row = HeaderRow | PoolRow;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Row>);

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

  const { handleNavigationWithAd } = useNavigationInterstitial();

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

  const flatData = useMemo(() => {
    const rows: Row[] = [];

    dayMatches.forEach((day: DayMatchesResponse) => {
      const sectionKey = String(day.date);

      rows.push({
        type: "sectionHeader",
        title: formatDateFrenchLocale(day.date),
        sectionKey,
      });

      day.pools.forEach((pool) => {
        rows.push({
          type: "pool",
          pool,
          sectionKey,
        });
      });
    });

    return rows;
  }, [dayMatches]);

  useEffect(() => {
    scrollY.setValue(0);
  }, [scrollY, poolIds, teamIds]);

  const onRetry = useCallback(() => {
    scrollY.setValue(0);
    refetch();
  }, [scrollY, refetch]);

  const getItemType = useCallback((item: Row) => item.type, []);

  const keyExtractor = useCallback((item: Row) => {
    switch (item.type) {
      case "sectionHeader":
        return `h-${item.sectionKey}`;
      case "pool":
        return `p-${item.pool.pool.id}-${item.sectionKey}`;
      default:
        return "unknown";
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Row>) => {
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
        keyExtractor={keyExtractor}
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
        ListEmptyComponent={() => (
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
        )}
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
