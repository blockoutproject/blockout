import { colors } from "@/src/constants/Colors";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    NavigationState,
    Route,
    SceneRendererProps,
    TabView,
} from "react-native-tab-view";

import MatchListTab from "@/src/components/match/matchList/MatchListTab";
import { MatchStatus } from "@/src/types/Match";
import Placeholder from "@/src/components/home/Placeholder";
import Filters from "@/src/components/home/Filters";
import { Filter } from "@/src/types/Filter";
import { useUserContext } from "@/src/hooks/user/useUserContext";
import { EntityType } from "@/src/types/User";

const HomeScreen: React.FC = () => {
    const [index, setIndex] = useState(0);
    const { customUser, isLoading } = useUserContext();

    if (isLoading || !customUser) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.dark }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // On récupère les ids des poules favorites de l'utilisateur
    const userFavoritePools = useMemo(() => {
        return customUser.favorites
            ?.filter(fav => fav.entityType === EntityType.POOL)
            .map(fav => fav.entityId) || [];
    }, [customUser.favorites]);

    // On récupère les ids des équipes favorites de l'utilisateur
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
        { key: "discover", title: "Découvrir" },
    ];

    const finishedTab = useMemo(() => (
        <MatchListTab
            poolIds={userFavoritePools}
            teamIds={userFavoriteTeams}
            status={MatchStatus.FINISHED}
        />
    ), [userFavoritePools, userFavoriteTeams, filters]);
    
    const upcomingTab = useMemo(() => (
        <MatchListTab
            poolIds={userFavoritePools}
            teamIds={userFavoriteTeams}
            status={MatchStatus.UPCOMING}
        />
    ), [userFavoritePools, userFavoriteTeams, filters]);
    
    const renderScene = ({ route }: SceneRendererProps & { route: Route }) => {
        switch (route.key) {
            case "finished":
                return finishedTab;
            case "upcoming":
                return upcomingTab;
            case "discover":
                return <Placeholder.PlaceholderScreen2 />;
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
            <View style={styles.container}>
                <View style={styles.tabBar}>
                    {props.navigationState.routes.map((route: Route, idx: number) => (
                        <Pressable
                            key={route.key}
                            onPress={() => props.jumpTo(route.key)}
                        >
                            <Text
                                style={{
                                    color:
                                        props.navigationState.index === idx
                                            ? colors.active
                                            : colors.inactive,
                                    ...styles.tabItem,
                                }}
                            >
                                {route.title}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* On place le composant Filters, auquel on passe filters et setFilters */}
                <Filters filters={filters} setFilters={setFilters} />
            </View>
        );
    };

    return (
        <TabView
            navigationState={{ index, routes }}
            onIndexChange={setIndex}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 6,
        backgroundColor: colors.dark,
    },
    tabBar: {
        flexDirection: "row",
        gap: 20,
        justifyContent: "center",
        paddingBottom: 15,
        backgroundColor: colors.dark,
    },
    tabItem: {
        fontSize: 18,
        fontWeight: "700",
    },
});

export default HomeScreen;