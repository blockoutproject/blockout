import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, View } from "react-native";
import {
  NavigationState,
  Route,
  SceneRendererProps,
  TabView,
} from "react-native-tab-view";
import MatchList from "@/src/modules/match/ui/MatchList";
import {
  EntityTypeEnum,
  MatchStatusEnum,
  ReportTypeEnum,
} from "@/src/shared/generated/models";
import FeedHeader from "@/src/modules/feed/ui/feed-header";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, spacing, typography } from "@/src/shared/theme";
import { useSessionState } from "@/src/modules/session/providers/SessionContext";
import ReportFormSheet from "@/src/modules/report/ui/ReportFormSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import FollowedScreen from "@/src/modules/followed/ui/FollowedScreen";
import { openNotificationUrlIfAny } from "@/src/modules/notifications/push";
import {
  isDefaultNotificationAction,
  useLastNotificationResponse,
} from "@/src/shared/hooks/useLastNotificationResponse";

const FeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { customUser } = useSessionState();
  const [index, setIndex] = useState(0);
  const reportSheetRef = useRef<BottomSheetModal>(null);

  const headerOffset = insets.top + layout.tabs + layout.logoCompact;
  const favorites = useMemo(
    () => customUser?.favorites ?? [],
    [customUser?.favorites],
  );
  const userFavoritePools = useMemo(
    () =>
      favorites
        .filter((f) => f.entityType === EntityTypeEnum.POOL)
        .map((f) => f.entityId),
    [favorites],
  );
  const userFavoriteTeams = useMemo(
    () =>
      favorites
        .filter((f) => f.entityType === EntityTypeEnum.TEAM)
        .map((f) => f.entityId),
    [favorites],
  );

  const routes = useMemo(
    () => [
      { key: "upcoming", title: "À Venir" },
      { key: "finished", title: "Terminés" },
      { key: "followed", title: "Suivis" },
    ],
    [],
  );

  const scrollYs = useRef<Record<string, Animated.Value>>({
    finished: new Animated.Value(0),
    upcoming: new Animated.Value(0),
    followed: new Animated.Value(0),
  }).current;

  const upcomingTab = useMemo(
    () => (
      <MatchList
        poolIds={userFavoritePools}
        teamIds={userFavoriteTeams}
        status={MatchStatusEnum.UPCOMING}
        scrollY={scrollYs.upcoming}
        contentContainerStyle={{
          paddingHorizontal: spacing[1],
        }}
        headerOffset={headerOffset}
        home
      />
    ),
    [userFavoritePools, userFavoriteTeams, headerOffset, scrollYs],
  );

  const finishedTab = useMemo(
    () => (
      <MatchList
        poolIds={userFavoritePools}
        teamIds={userFavoriteTeams}
        status={MatchStatusEnum.FINISHED}
        scrollY={scrollYs.finished}
        contentContainerStyle={{
          paddingHorizontal: spacing[1],
        }}
        headerOffset={headerOffset}
        home
      />
    ),
    [userFavoritePools, userFavoriteTeams, headerOffset, scrollYs],
  );

  const followedTab = useMemo(
    () => (
      <FollowedScreen
        poolIds={userFavoritePools}
        teamIds={userFavoriteTeams}
        headerOffset={headerOffset}
      />
    ),
    [userFavoritePools, userFavoriteTeams, headerOffset],
  );

  const onTabChange = useCallback((i: number) => setIndex(i), []);

  const renderScene = useCallback(
    ({ route }: SceneRendererProps & { route: Route }) => {
      switch (route.key) {
        case "upcoming":
          return upcomingTab;
        case "finished":
          return finishedTab;
        case "followed":
          return followedTab;
        default:
          return null;
      }
    },
    [finishedTab, upcomingTab, followedTab],
  );

  const renderTabBar = useCallback(
    (
      props: SceneRendererProps & { navigationState: NavigationState<Route> },
    ) => (
      <FeedHeader
        {...props}
        scrollYs={scrollYs}
        onOpenReport={() => reportSheetRef.current?.present()}
      />
    ),
    [scrollYs],
  );

  const lastNotificationResponse = useLastNotificationResponse();

  useEffect(() => {
    if (
      lastNotificationResponse &&
      isDefaultNotificationAction(lastNotificationResponse)
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      openNotificationUrlIfAny(data as Record<string, unknown>);
    }
  }, [lastNotificationResponse]);
  return (
    <View style={styles.screen} testID="feed-screen">
      <TabView
        lazy
        lazyPreloadDistance={1}
        renderLazyPlaceholder={() => null}
        navigationState={{ index, routes }}
        onIndexChange={onTabChange}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        commonOptions={{ labelStyle: styles.tabItem }}
      />
      <ReportFormSheet
        ref={reportSheetRef}
        context={{ screen: "Feed", defaultType: ReportTypeEnum.DISPLAY_BUG }}
        onSuccess={() => {
          reportSheetRef.current?.dismiss();
        }}
        snapPoint="90%"
        footerLabel="Envoyer"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabItem: typography.compactStrong,
});

export default FeedScreen;
