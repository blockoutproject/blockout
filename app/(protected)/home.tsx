import { colors } from "@/constants/Colors";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import {
    NavigationState,
    Route,
    SceneMap,
    SceneRendererProps,
    TabView,
} from "react-native-tab-view";
import MatchListTab from "@/components/match/MatchListTab";
import { MatchStatus } from "@/types/Match";
import Placeholder from "@/components/home/Placeholder";
import Filters from "@/components/home/Filters";

const renderScene = SceneMap({
    over: () => <MatchListTab status={MatchStatus.FINISHED} />,
    upcoming: () => <MatchListTab status={MatchStatus.UPCOMING} />,
    search: Placeholder.PlaceholderScreen2,
});

const renderTabBar = (
    props: SceneRendererProps & {
        navigationState: NavigationState<Route>;
    }
) => {
    return (
        <View>
            <View style={styles.tabBar}>
                {props.navigationState.routes.map(
                    (route: Route, index: number) => (
                        <Pressable
                            key={route.key}
                            onPress={() => props.jumpTo(route.key)}
                        >
                            <Text
                                style={{
                                    color:
                                        props.navigationState.index === index
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
            <Filters />
        </View>
    );
};

const HomeScreen: React.FC = () => {
    const layout = useWindowDimensions();
    const [index, setIndex] = React.useState(0);

    const routes = [
        { key: "over", title: "Terminés" },
        { key: "upcoming", title: "A Venir" },
        { key: "search", title: "Découvrir" },
    ];

    return (
        <TabView
            initialLayout={{ height: layout.height, width: layout.width }} // is this necessary? good precaution?
            navigationState={{ index, routes }}
            onIndexChange={setIndex}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
        />
    );
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: "row",
        gap: 15,
        justifyContent: "center",
        paddingBottom: 15,
        backgroundColor: colors.dark,
    },
    tabItem: {
        fontSize: 18,
        fontWeight: "800",
    },
    activeTabItem: {
        color: colors.active,
    },
    inactiveTabItem: {
        color: colors.inactive,
    },
});

export default HomeScreen;
