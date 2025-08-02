import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { NavigationState, Route, SceneRendererProps, TabView } from 'react-native-tab-view';
import MatchList from '@/src/components/matchList/MatchListContainer';
import { MatchStatus } from '@/src/types/Match';
import { EntityType } from '@/src/types/User';
import AnimatedHomeHeader from '@/src/components/home/AnimatedHomeHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserContext } from '@/src/context/UserProvider';

const HomeScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { customUser } = useUserContext();

    const scrollY = useRef(new Animated.Value(0)).current;

    const [titleHeight, setTitleHeight] = useState(0);
    const [tabBarHeight, setTabBarHeight] = useState(0);
    const [index, setIndex] = useState(0);
    const [headerOffset, setHeaderOffset] = useState(0);

    useEffect(() => {
        setHeaderOffset(insets.top + tabBarHeight + titleHeight);
    }, [insets.top, tabBarHeight, titleHeight]);

    const favorites = customUser?.favorites ?? [];

    const userFavoritePools = useMemo(
        () =>
            favorites
                .filter((fav) => fav.entityType === EntityType.POOL)
                .map((fav) => fav.entityId),
        [favorites]
    );

    const userFavoriteTeams = useMemo(
        () =>
            favorites
                .filter((fav) => fav.entityType === EntityType.TEAM)
                .map((fav) => fav.entityId),
        [favorites]
    );

    const routes = useMemo(
        () => [
            { key: 'finished', title: 'Terminés' },
            { key: 'upcoming', title: 'À Venir' },
        ],
        []
    );

    const finishedTab = useMemo(
        () => (
            <MatchList
                poolIds={userFavoritePools}
                teamIds={userFavoriteTeams}
                status={MatchStatus.FINISHED}
                scrollY={scrollY}
                headerOffset={headerOffset}
                contentContainerStyle={{
                    paddingHorizontal: 4,
                    marginTop: insets.top + tabBarHeight + 8,
                    paddingTop: titleHeight,
                    paddingBottom: headerOffset + 8,
                }}
                home
            />
        ),
        [userFavoritePools, userFavoriteTeams, headerOffset, insets.top, tabBarHeight, titleHeight, scrollY]
    );

    const upcomingTab = useMemo(
        () => (
            <MatchList
                poolIds={userFavoritePools}
                teamIds={userFavoriteTeams}
                status={MatchStatus.UPCOMING}
                scrollY={scrollY}
                headerOffset={headerOffset}
                contentContainerStyle={{
                    paddingHorizontal: 4,
                    marginTop: insets.top + tabBarHeight + 8,
                    paddingTop: titleHeight,
                    paddingBottom: headerOffset + 8,
                }}
                home
            />
        ),
        [userFavoritePools, userFavoriteTeams, headerOffset, insets.top, tabBarHeight, titleHeight, scrollY]
    );

    const onTabChange = useCallback((i: number) => {
        setIndex(i);
    }, []);

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
            <AnimatedHomeHeader
                {...props}
                scrollY={scrollY}
                onTitleLayout={setTitleHeight}
                onTabBarLayout={setTabBarHeight}
            />
        ),
        [scrollY]
    );

    if (!customUser) {
        return null;
    }

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