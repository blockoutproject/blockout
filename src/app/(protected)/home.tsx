import React, { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import {
    NavigationState,
    Route,
    SceneRendererProps,
    TabView,
} from "react-native-tab-view";
import MatchListTab from "@/src/components/match/matchList/MatchListTab";
import { MatchStatus } from "@/src/types/Match";
import { Filter } from "@/src/types/Filter";
import { useUserContext } from "@/src/hooks/user/useUserContext";
import { EntityType } from "@/src/types/User";
import HomeHeader from "@/src/components/home/HomeHeader";
import * as Haptics from "expo-haptics";
import MatchListTabSkeleton from "@/src/components/match/matchList/components/MatchListSkeleton";
import { useAppTheme } from "@/src/context/ThemeProvider"; // 🔥 Thème dynamique

const HomeScreen: React.FC = () => {
    const [index, setIndex] = useState(0);
    const { customUser } = useUserContext();
    const [headerHeight, setHeaderHeight] = useState(0);

    if (!customUser) return null;

    const userFavoritePools = useMemo(() => {
        return customUser.favorites
            ?.filter(fav => fav.entityType === EntityType.POOL)
            .map(fav => fav.entityId) || [];
    }, [customUser.favorites]);

    const userFavoriteTeams = useMemo(() => {
        return customUser.favorites
            ?.filter(fav => fav.entityType === EntityType.TEAM)
            .map(fav => fav.entityId) || [];
    }, [customUser.favorites]);

    const [filters, setFilters] = useState<Filter[]>([
        { name: "Pro", dbValue: "PRO", isActive: false },
        { name: "Nationale", dbValue: "NAT", isActive: false },
        { name: "Régionale", dbValue: "REG", isActive: false },
        { name: "Masc", dbValue: "M", isActive: false },
        { name: "Fem", dbValue: "F", isActive: false },
        { name: "Mixte", dbValue: "O", isActive: false },
    ]);

    const routes = [
        { key: "finished", title: "Terminés" },
        { key: "upcoming", title: "À Venir" },
    ];

    const finishedTab = useMemo(() => (
        <MatchListTab
            poolIds={userFavoritePools}
            teamIds={userFavoriteTeams}
            status={MatchStatus.FINISHED}
            headerOffset={headerHeight}
        />
    ), [userFavoritePools, userFavoriteTeams, filters, headerHeight]);

    const upcomingTab = useMemo(() => (
        <MatchListTab
            poolIds={userFavoritePools}
            teamIds={userFavoriteTeams}
            status={MatchStatus.UPCOMING}
            headerOffset={headerHeight}
        />
    ), [userFavoritePools, userFavoriteTeams, filters, headerHeight]);

    const onTabChange = (i: number) => {
        Haptics.selectionAsync();
        setIndex(i);
    };

    const renderScene = ({ route }: SceneRendererProps & { route: Route }) => {
        switch (route.key) {
            case "finished":
                return finishedTab;
            case "upcoming":
                return upcomingTab;
            default:
                return null;
        }
    };

    const renderTabBar = (
        props: SceneRendererProps & {
            navigationState: NavigationState<Route>;
        }
    ) => {
        return (
            <HomeHeader
                {...props}
                onLayout={(height) => setHeaderHeight(height)}
            />
        );
    };

    return (
        <TabView
            lazy
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
        fontSize: 16,
        fontWeight: "700",
    },
});

export default HomeScreen;