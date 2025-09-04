import React, { useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { NavigationState, Route, SceneRendererProps, TabView } from 'react-native-tab-view';
import MatchList from '@/src/components/matchList/MatchListContainer';
import { MatchStatus } from '@/src/types/Match';
import { EntityType } from '@/src/types/User';
import AnimatedFeedHeader from '@/src/components/home/AnimatedFeedHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_TABBAR_HEIGHT, LOGO_HEIGHT, TABBAR_HEIGHT } from '@/src/theme/globals';
import { useSession } from '@/src/context/SessionProvider';

const FeedScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { customUser } = useSession();
    const [index, setIndex] = useState(0);

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
            { key: 'finished', title: 'Terminés' },
            { key: 'upcoming', title: 'À Venir' },
        ],
        []
    );

    const scrollYs = useRef<Record<string, Animated.Value>>({
        finished: new Animated.Value(0),
        upcoming: new Animated.Value(0),
    }).current;

    const finishedTab = useMemo(
        () => (
            <MatchList
                poolIds={userFavoritePools}
                teamIds={userFavoriteTeams}
                status={MatchStatus.FINISHED}
                scrollY={scrollYs.finished}
                contentContainerStyle={{
                    paddingHorizontal: 4,
                    marginTop: insets.top + TABBAR_HEIGHT + 4,
                    paddingTop: LOGO_HEIGHT,
                    paddingBottom: insets.bottom + insets.top + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                }}
                headerOffset={headerOffset}
                home
            />
        ),
        [
            userFavoritePools,
            userFavoriteTeams,
            insets.top,
            insets.bottom,
            headerOffset,
            scrollYs,
        ]
    );

    const upcomingTab = useMemo(
        () => (
            <MatchList
                poolIds={userFavoritePools}
                teamIds={userFavoriteTeams}
                status={MatchStatus.UPCOMING}
                scrollY={scrollYs.upcoming}
                contentContainerStyle={{
                    paddingHorizontal: 4,
                    marginTop: insets.top + TABBAR_HEIGHT + 4,
                    paddingTop: LOGO_HEIGHT,
                    paddingBottom: insets.bottom + insets.top + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                }}
                headerOffset={headerOffset}
                home
            />
        ),
        [
            userFavoritePools,
            userFavoriteTeams,
            insets.top,
            insets.bottom,
            headerOffset,
            scrollYs,
        ]
    );

    const onTabChange = useCallback((i: number) => setIndex(i), []);

    const renderScene = useCallback(
        ({ route }: SceneRendererProps & { route: Route }) => {
            switch (route.key) {
                case 'finished':
                    return finishedTab;
                case 'upcoming':
                    return upcomingTab;
                default:
                    return null;
            }
        },
        [finishedTab, upcomingTab]
    );

    const renderTabBar = useCallback(
        (props: SceneRendererProps & { navigationState: NavigationState<Route> }) => (
            <AnimatedFeedHeader {...props} scrollYs={scrollYs} />
        ),
        [scrollYs]
    );

    return (
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
    );
};

const styles = StyleSheet.create({
    tabItem: { fontSize: 14, fontWeight: '700' },
});

export default FeedScreen;