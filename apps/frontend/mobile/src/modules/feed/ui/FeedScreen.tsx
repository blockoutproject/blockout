import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet} from 'react-native';
import {NavigationState, Route, SceneRendererProps, TabView} from 'react-native-tab-view';
import MatchList from '@/src/components/matchList/MatchListContainer';
import {MatchStatus} from '@/src/types/Match';
import {EntityType} from '@/src/types/User';
import AnimatedFeedHeader from '@/src/components/home/AnimatedFeedHeader';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LOGO_HEIGHT, TABBAR_HEIGHT} from '@/src/shared/theme/tokens';
import {useSessionState} from '@/src/shared/providers/SessionProvider';
import ReportFormSheet from '@/src/modules/report/ui/ReportFormSheet';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ReportType} from '@/src/modules/report/model/Report';
import FollowedScreen from '@/src/modules/followed/ui/FollowedScreen';
import {openNotificationUrlIfAny} from '@/src/modules/notifications/push';
import {
  isDefaultNotificationAction,
  useLastNotificationResponse,
} from '@/src/shared/hooks/useLastNotificationResponse';

const FeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {customUser, isGuest} = useSessionState();
  const [index, setIndex] = useState(0);
  const reportSheetRef = useRef<BottomSheetModal>(null);

  const headerOffset = insets.top + TABBAR_HEIGHT + LOGO_HEIGHT;
  const favorites = customUser?.favorites ?? [];
  const userFavoritePools = useMemo(
    () => favorites.filter(f => f.entityType === EntityType.POOL).map(f => f.entityId),
    [favorites]
  );
  const userFavoriteTeams = useMemo(
    () => favorites.filter(f => f.entityType === EntityType.TEAM).map(f => f.entityId),
    [favorites]
  );

  const routes = useMemo(
    () => [
      {key: 'upcoming', title: 'À Venir'},
      {key: 'finished', title: 'Terminés'},
      {key: 'followed', title: 'Suivis'},
    ],
    []
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
        status={MatchStatus.UPCOMING}
        scrollY={scrollYs.upcoming}
        contentContainerStyle={{
          paddingHorizontal: 4,
        }}
        headerOffset={headerOffset}
        home
      />
    ),
    [
      userFavoritePools,
      userFavoriteTeams,
      headerOffset,
      scrollYs,
    ]
  );

  const finishedTab = useMemo(
    () => (
      <MatchList
        poolIds={userFavoritePools}
        teamIds={userFavoriteTeams}
        status={MatchStatus.FINISHED}
        scrollY={scrollYs.finished}
        contentContainerStyle={{
          paddingHorizontal: 4,
        }}
        headerOffset={headerOffset}
        home
      />
    ),
    [
      userFavoritePools,
      userFavoriteTeams,
      headerOffset,
      scrollYs,
    ]
  );

  const followedTab = useMemo(
    () => (
      <FollowedScreen
        poolIds={userFavoritePools}
        teamIds={userFavoriteTeams}
        headerOffset={headerOffset}
      />
    ),
    [
      userFavoritePools,
      userFavoriteTeams,
      headerOffset,
      scrollYs,
    ]
  );

  const onTabChange = useCallback((i: number) => setIndex(i), []);

  const renderScene = useCallback(
    ({route}: SceneRendererProps & { route: Route }) => {
      switch (route.key) {
        case 'upcoming':
          return upcomingTab;
        case 'finished':
          return finishedTab;
        case 'followed':
          return followedTab;
        default:
          return null;
      }
    },
    [finishedTab, upcomingTab, followedTab]
  );

  const renderTabBar = useCallback(
    (props: SceneRendererProps & { navigationState: NavigationState<Route> }) => (
      <AnimatedFeedHeader {...props} scrollYs={scrollYs} onOpenReport={() => reportSheetRef.current?.present()}/>
    ),
    [scrollYs]
  );

  const lastNotificationResponse = useLastNotificationResponse();

  useEffect(() => {
    if (lastNotificationResponse && isDefaultNotificationAction(lastNotificationResponse)) {
      const data = lastNotificationResponse.notification.request.content.data;
      openNotificationUrlIfAny(data as Record<string, unknown>);
    }
  }, [lastNotificationResponse]);
  return (
    <>
      <TabView
        lazy
        lazyPreloadDistance={1}
        renderLazyPlaceholder={() => null}
        navigationState={{index, routes}}
        onIndexChange={onTabChange}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        commonOptions={{labelStyle: styles.tabItem}}
      />
      <ReportFormSheet
        ref={reportSheetRef}
        context={{screen: "Feed", defaultType: ReportType.DISPLAY_BUG}}
        onSuccess={() => {
          reportSheetRef.current?.dismiss();
        }}
        snapPoint="90%"
        footerLabel="Envoyer"
      />
    </>
  );
};

const styles = StyleSheet.create({
  tabItem: {fontSize: 14, fontWeight: '700'},
});

export default FeedScreen;
