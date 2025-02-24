import { colors } from "@/constants/Colors";
import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { TabView, SceneMap, SceneRendererProps, NavigationState, Route } from "react-native-tab-view";

type TabDefinition = {
    key: string;
    title: string;
    render: () => JSX.Element;
};

type GenericTabViewProps = {
    tabs: TabDefinition[];
    indicatorColor: string;
};

const GenericTabView: React.FC<GenericTabViewProps> = ({ tabs, indicatorColor }) => {
    const layout = useWindowDimensions();
    const [index, setIndex] = useState(0);

    const routes = tabs.map(({ key, title }) => ({ key, title }));

    const sceneMapObj = tabs.reduce((acc, tab) => {
        acc[tab.key] = tab.render;
        return acc;
    }, {} as { [key: string]: () => JSX.Element });

    const renderScene = SceneMap(sceneMapObj);

    const renderTabBar = (
        props: SceneRendererProps & {
            navigationState: NavigationState<Route>;
        }
    ) => (
        <View style={styles.container}>
            {props.navigationState.routes.map((route: Route, i: number) => {
                const active = i === props.navigationState.index;
                return (
                    <Pressable
                        key={route.key}
                        onPress={() => props.jumpTo(route.key)}
                        style={{ marginHorizontal: 16, paddingVertical: 8 }}
                    >
                        <Text style={{ color: active ? "white" : "gray", fontWeight: "600" }}>
                            {route.title}
                        </Text>
                        {active && (
                            <View
                                style={{
                                    marginTop: 3,
                                    height: 2,
                                    width: "70%",
                                    backgroundColor: indicatorColor,
                                    alignSelf: "center",
                                }}
                            />
                        )}
                    </Pressable>
                );
            })}
        </View>
    );

    return (
        <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={renderTabBar}
        />
    );
};

const styles = StyleSheet.create({
    container: { 
        flexDirection: "row", 
        justifyContent: "center", 
        backgroundColor: colors.dark
    }
});

export default GenericTabView;