import React, { useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, Animated, SectionList as RNSectionList } from 'react-native';
import { NavigationState, Route, SceneRendererProps, TabView } from 'react-native-tab-view';
import MatchList from '@/src/components/matchList/MatchListContainer';
import { MatchStatus } from '@/src/types/Match';
import { EntityType } from '@/src/types/User';
import AnimatedHomeHeader from '@/src/components/home/AnimatedHomeHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserContext } from '@/src/context/UserProvider';
import { useSheet } from '@/src/context/SheetProvider';
import { HEADER_HEIGHT, TABBAR_HEIGHT } from '@/src/theme/globals';
import VolleyballLoader from '@/src/components/common/VolleyballLoader';

const HomeScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { customUser } = useUserContext();
    const { open } = useSheet();

    const [index, setIndex] = useState(0);

    const headerOffset = insets.top + TABBAR_HEIGHT + HEADER_HEIGHT;

    const favorites = customUser?.favorites ?? [];
    const userFavoritePools = useMemo(
        () => favorites.filter(f => f.entityType === EntityType.POOL).map(f => f.entityId),
        [favorites]
    );
    const userFavoriteTeams = useMemo(
        () => favorites.filter(f => f.entityType === EntityType.TEAM).map(f => f.entityId),
        [favorites]
    );

    const routes = useMemo(() => [
        { key: 'finished', title: 'Terminés' },
        { key: 'upcoming', title: 'À Venir' },
    ], []);

    // 👇 Un Animated.Value par onglet (stable sur toute la vie du composant)
    const scrollYs = useRef<Record<string, Animated.Value>>({
        finished: new Animated.Value(0),
        upcoming: new Animated.Value(0),
    }).current;

    const finishedTab = useMemo(() => (
        <MatchList
            poolIds={userFavoritePools}
            teamIds={userFavoriteTeams}
            status={MatchStatus.FINISHED}
            scrollY={scrollYs.finished}
            contentContainerStyle={{
                paddingHorizontal: 4,
                marginTop: insets.top + TABBAR_HEIGHT,
                paddingTop: HEADER_HEIGHT,
                paddingBottom: insets.bottom + insets.top + TABBAR_HEIGHT,
            }}
            headerOffset={headerOffset}
            home
            openSheet={open}
        />
    ), [userFavoritePools, userFavoriteTeams, headerOffset, insets.bottom, open, scrollYs.finished]);

    const upcomingTab = useMemo(() => (
        <MatchList
            poolIds={userFavoritePools}
            teamIds={userFavoriteTeams}
            status={MatchStatus.UPCOMING}
            scrollY={scrollYs.upcoming}
            contentContainerStyle={{
                paddingHorizontal: 4,
                marginTop: insets.top + TABBAR_HEIGHT,
                paddingTop: HEADER_HEIGHT,
                paddingBottom: insets.bottom + insets.top + TABBAR_HEIGHT,
            }}
            headerOffset={headerOffset}
            home
            openSheet={open}
        />
    ), [userFavoritePools, userFavoriteTeams, headerOffset, insets.bottom, open, scrollYs.upcoming]);

    const onTabChange = useCallback((i: number) => setIndex(i), []);

    const renderScene = useCallback(
        ({ route }: SceneRendererProps & { route: Route }) => {
            switch (route.key) {
                case 'finished': return finishedTab;
                case 'upcoming': return upcomingTab;
                default: return null;
            }
        },
        [finishedTab, upcomingTab]
    );

    const renderTabBar = useCallback(
        (props: SceneRendererProps & { navigationState: NavigationState<Route> }) => (
            <AnimatedHomeHeader
                {...props}
                scrollYs={scrollYs}
            />
        ),
        [scrollYs]
    );

    return (
        <TabView
            lazy={false}
            navigationState={{ index, routes }}
            onIndexChange={onTabChange}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            commonOptions={{ labelStyle: styles.tabItem }}
        />
    );
};

const styles = StyleSheet.create({
    tabItem: {
        fontSize: 14,
        fontWeight: '700',
    },
});

export default HomeScreen;