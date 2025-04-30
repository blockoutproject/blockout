import React, { useState } from "react";
import {
    Text,
    View,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    ScrollView,
} from "react-native";
import {
    TabView,
    SceneRendererProps,
    NavigationState,
    Route,
} from "react-native-tab-view";
import { colors } from "@/src/constants/Colors";

type TabDefinition = {
    key: string;
    title: string;
    render: () => JSX.Element;
};

type GenericTabViewProps = {
    tabs: TabDefinition[];
    indicatorColor: string;
};

const GenericTabView: React.FC<GenericTabViewProps> = ({
    tabs,
    indicatorColor,
}) => {
    const [index, setIndex] = useState(0);

    const routes = tabs.map(({ key, title }) => ({ key, title }));

    const renderScene = ({
        route,
    }: SceneRendererProps & { route: Route }) => {
        const tabDef = tabs.find((t) => t.key === route.key);
        return tabDef ? tabDef.render() : null;
    };

    const renderTabBar = (
        props: SceneRendererProps & {
            navigationState: NavigationState<Route>;
            jumpTo: (key: string) => void;
        }
    ) => (
        <ScrollView
            horizontal
            style={styles.tabBar}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
        >
            {props.navigationState.routes.map((route: Route, i: number) => {
                const active = i === props.navigationState.index;
                return (
                    <Pressable
                        key={route.key}
                        onPress={() => props.jumpTo(route.key)}
                        style={styles.tabButton}
                    >
                        <Text
                            style={[
                                styles.tabLabel,
                                active && styles.tabLabelActive,
                            ]}
                        >
                            {route.title}
                        </Text>
                        {active && (
                            <View
                                style={[
                                    styles.indicator,
                                    { backgroundColor: indicatorColor },
                                ]}
                            />
                        )}
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    return (
        <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            lazy
            removeClippedSubviews={false}
            renderTabBar={renderTabBar}
        />
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flexGrow: 0,
        paddingVertical: 4,
    },
    tabBarContent: {
        flexGrow: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    tabButton: {
        marginHorizontal: 16,
        paddingVertical: 4,
    },
    tabLabel: {
        color: colors.inactive,
        fontSize: 15,
    },
    tabLabelActive: {
        color: colors.active,
        fontWeight: "700",
    },
    indicator: {
        marginTop: 8,
        height: 3,
        borderRadius: 20,
        width: "70%",
        alignSelf: "center",
    },
});

export default GenericTabView;