import React, { useState } from "react";
import {
    Text,
    View,
    Pressable,
    StyleSheet,
    useWindowDimensions
} from "react-native";
import {
    TabView,
    SceneRendererProps,
    NavigationState,
    Route
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

const GenericTabView: React.FC<GenericTabViewProps> = ({ tabs, indicatorColor }) => {
    const layout = useWindowDimensions();
    const [index, setIndex] = useState(0);

    // On construit les routes pour le TabView (une pour chaque tab)
    const routes = tabs.map(({ key, title }) => ({ key, title }));

    // renderScene personnalisé :
    // - On cherche l'onglet correspondant à route.key
    // - On renvoie son JSX (tab.render())
    // - On évite ainsi l'utilisation de SceneMap, qui démonte/remonte souvent
    const renderScene = ({
        route
    }: SceneRendererProps & { route: Route }) => {
        const tabDef = tabs.find((t) => t.key === route.key);
        if (!tabDef) return null;
        return tabDef.render();
    };

    // Bar d’onglet custom
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
                        style={{ marginHorizontal: 16, paddingVertical: 4 }}
                    >
                        <Text style={{ color: active ? "white" : "gray", fontSize: 15, fontWeight: "700" }}>
                            {route.title}
                        </Text>
                        {active && (
                            <View
                                style={{
                                    marginTop: 3,
                                    height: 1,
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
            lazy={true}
            removeClippedSubviews={false}
            renderTabBar={renderTabBar}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "center",
        backgroundColor: colors.dark,
    }
});

export default GenericTabView;