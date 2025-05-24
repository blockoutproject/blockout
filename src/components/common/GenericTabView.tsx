import React, { useState } from "react";
import { StyleSheet } from "react-native";
import {
    TabView,
    SceneRendererProps,
    NavigationState,
    Route,
    TabBar,
} from "react-native-tab-view";
import { useAppTheme } from "@/src/context/ThemeProvider";

type TabDefinition = {
    key: string;
    title: string;
    render: () => JSX.Element;
};

type GenericTabViewProps = {
    tabs: TabDefinition[];
    indicatorColor?: string;
};

const GenericTabView: React.FC<GenericTabViewProps> = ({
    tabs,
    indicatorColor,
}) => {
    const [index, setIndex] = useState(0);
    const theme = useAppTheme();

    const routes = tabs.map(({ key, title }) => ({ key, title }));

    const renderScene = ({
        route,
    }: SceneRendererProps & { route: Route }) => {
        const tabDef = tabs.find((t) => t.key === route.key);
        return tabDef ? tabDef.render() : null;
    };

    const renderTabBar = (props: SceneRendererProps & {
        navigationState: NavigationState<Route>;
    }) => (
        <TabBar
            {...props}
            scrollEnabled
            style={styles.tabBar}
            tabStyle={styles.tabStyle}
            activeColor={theme.text}
            inactiveColor={theme.textInactive}
            indicatorStyle={[
                styles.indicator,
                { backgroundColor: indicatorColor || theme.text },
            ]}
        />
    );

    return (
        <TabView
            lazy
            navigationState={{ index, routes }}
            onIndexChange={setIndex}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            commonOptions={{ labelStyle: styles.tabItem }}
        />
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: "transparent",
        paddingVertical: 4,
    },
    tabStyle: {
        width: "auto",
        paddingHorizontal: 20,
    },
    indicator: {
        height: 3,
        width: 0.5,
    },
    tabItem: {
        fontSize: 14,
        fontWeight: "700",
    },
});

export default GenericTabView;