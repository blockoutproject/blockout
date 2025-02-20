import { colors } from "@/constants/colors";
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

type TabViewScreen = {
    title: string;
    view: () => React.JSX.Element;
};

type CustomTabViewProps = {
    firstScreen: TabViewScreen;
    secondScreen: TabViewScreen;
    thirdScreen: TabViewScreen;
    indicatorColor: string;
};

const CustomTabView: React.FC<CustomTabViewProps> = ({
    firstScreen,
    secondScreen,
    thirdScreen,
    indicatorColor,
}) => {

    const layout = useWindowDimensions();
    const [index, setIndex] = React.useState(0);
    const routes = [
        { key: "first", title: firstScreen.title },
        { key: "second", title: secondScreen.title },
        { key: "third", title: thirdScreen.title },
    ];
    const renderScene = SceneMap({
        first: firstScreen.view,
        second: secondScreen.view,
        third: thirdScreen.view,
    });
    const renderTabBar = (
        props: SceneRendererProps & {
            navigationState: NavigationState<Route>;
        }
    ) => {
        return (
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
                            {/* tab indicator */}
                            {props.navigationState.index === index ? (
                                <View
                                    style={{
                                        marginTop: 3,
                                        height: 2,
                                        width: "70%",
                                        backgroundColor: indicatorColor,
                                        alignSelf: "center",
                                    }}
                                />
                            ) : (
                                <></>
                            )}
                        </Pressable>
                    )
                )}
            </View>
        );
    };
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
        gap: 25,
        justifyContent: "center",
        paddingBottom: 5,
        backgroundColor: colors.dark,
    },
    tabItem: {
        fontSize: 16,
        fontWeight: "800",
    },
    activeTabItem: {
        color: colors.active,
    },
    inactiveTabItem: {
        color: colors.inactive,
    },
});

export default CustomTabView;