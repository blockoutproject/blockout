import React, { JSX, useState, useMemo } from "react";
import {
    StyleSheet,
    Animated,
    View,
    Platform,
} from "react-native";
import {
    TabView,
    SceneRendererProps,
    NavigationState,
    Route,
    TabBar,
} from "react-native-tab-view";
import { useAppTheme } from "@/src/context/ThemeProvider";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { TABBAR_HEIGHT, TABBAR_INDICATOR_HEIGHT } from "@/src/theme/globals";

type TabDefinition = {
    key: string;
    title: string;
    render: () => JSX.Element | null;
};

type GenericTabViewProps = {
    tabs: TabDefinition[];
    scrollYs: Record<string, Animated.Value>;
};

const GenericTabView: React.FC<GenericTabViewProps> = ({
    tabs,
    scrollYs,
}) => {
    const [index, setIndex] = useState(0);
    const theme = useAppTheme();

    const routes = useMemo(() => tabs.map(({ key, title }) => ({ key, title })), [tabs]);

    const renderScene = ({
        route,
    }: SceneRendererProps & { route: Route }) => {
        const tabDef = tabs.find((t) => t.key === route.key);
        return tabDef ? tabDef.render() : null;
    };

    const renderTabBar = (
        props: SceneRendererProps & { navigationState: NavigationState<Route> }
    ) => {
        const { position } = props;

        // Calcule l’opacité combinée selon scrollY de chaque tab + transition swipe
        const interpolatedOpacity = routes.reduce<Animated.AnimatedAddition<number>>((acc, route, i) => {
            const input = position.interpolate({
                inputRange: routes.map((_, idx) => idx),
                outputRange: routes.map((_, idx) => (idx === i ? 1 : 0)),
                extrapolate: "clamp",
            });

            const verticalOpacity = scrollYs[route.key].interpolate({
                inputRange: [0, 40],
                outputRange: [0, 1],
                extrapolate: "clamp",
            });

            const contribution = Animated.multiply(input, verticalOpacity);

            return acc ? Animated.add(acc, contribution) : contribution;
        }, new Animated.Value(0));

        return (
            <View style={styles.container}>
                {Platform.OS === "ios" && (
                    <View style={StyleSheet.absoluteFill}>
                        <Animated.View
                            style={[StyleSheet.absoluteFill, { opacity: interpolatedOpacity }]}
                        >
                            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                        </Animated.View>

                        <LinearGradient
                            colors={[theme.background, "transparent"]}
                            start={{ x: 0, y: 0.35 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                )}

                <View
                    style={[
                        styles.tabBarContainer,
                        {
                            backgroundColor:
                                Platform.OS === "android" ? theme.background : "transparent",
                        },
                    ]}
                >
                    <TabBar
                        {...props}
                        onTabPress={Haptics.selectionAsync}
                        scrollEnabled
                        indicatorStyle={[styles.indicator, { backgroundColor: theme.text }]}
                        tabStyle={styles.tabStyle}
                        style={styles.tabBar}
                        activeColor={theme.text}
                        inactiveColor={theme.textInactive}
                    />
                </View>
            </View>
        );
    };

    return (
        <TabView
            lazy={false}
            navigationState={{ index, routes }}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            onIndexChange={setIndex}
            commonOptions={{ labelStyle: styles.tabItem }}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    tabBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    tabBar: {
        flex: 1,
        height: TABBAR_HEIGHT,
        backgroundColor: "transparent",
    },
    tabStyle: {
        width: "auto",
        paddingHorizontal: 16,
    },
    indicator: {
        height: TABBAR_INDICATOR_HEIGHT,
        width: 0.4,
    },
    tabItem: {
        fontSize: 14,
        fontWeight: "700",
    },
});

export default GenericTabView;