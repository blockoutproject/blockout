import { colors } from "@/constants/colors";
import MatchList from "@/components/match/MatchList";
import Placeholder from "../../components/Placeholder";

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

const renderScene = SceneMap({
    results: () => <MatchListTab status={MatchStatus.FINISHED} />,
    to_come: () => <MatchListTab status={MatchStatus.UPCOMING} />,
    discover: Placeholder.PlaceholderScreen2,
});

const renderTabBar = (
    props: SceneRendererProps & {
        navigationState: NavigationState<Route>;
    }
) => {
    return (
        <View style={styles.tabBar}>
            {props.navigationState.routes.map((route: Route, index: number) => (
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
    );
};

export default function HomeScreen() {
    const layout = useWindowDimensions();
    const [index, setIndex] = React.useState(0);

    const routes = [
        { key: "results", title: "Résultat" },
        { key: "to_come", title: "A Venir" },
        { key: "discover", title: "Découvrir" },
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
