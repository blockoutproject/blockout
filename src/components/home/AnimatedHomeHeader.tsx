import React, { useEffect, useState } from "react";
import {
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
    LayoutChangeEvent,
} from "react-native";
import FastImage from "react-native-fast-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import {
    TabBar,
    SceneRendererProps,
    NavigationState,
    Route,
} from "react-native-tab-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/src/context/ThemeProvider";


type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    onLayout: (height: number) => void;
    scrollY: Animated.Value;
};

const AnimatedHomeHeader: React.FC<HeaderProps> = ({ onLayout, scrollY, ...props }) => {
    const router = useRouter();
    const { user } = useAuth0();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    const [titleHeight, setTitleHeight] = useState(0);
    const [tabHeight, setTabHeight] = useState(0);

    const totalHeight = insets.top + titleHeight + tabHeight;

    useEffect(() => {
        if (titleHeight && tabHeight) {
            onLayout(totalHeight);
        }
    }, [titleHeight, tabHeight]);

    const translateY = scrollY.interpolate({
        inputRange: [0, titleHeight],
        outputRange: [0, -titleHeight],
        extrapolate: "clamp",
    });

    const titleOpacity = scrollY.interpolate({
        inputRange: [0, titleHeight / 1.5],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    return (
        <Animated.View
            style={[styles.container, { paddingTop: insets.top, transform: [{ translateY }] }]}
        >
            <View style={StyleSheet.absoluteFill}>
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            opacity: scrollY.interpolate({
                                inputRange: [0, 30], // ajustable
                                outputRange: [0, 1],
                                extrapolate: "clamp",
                            }),
                        },
                    ]}
                >
                    <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                </Animated.View>

                <LinearGradient
                    colors={[theme.background, "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <Animated.Text
                onLayout={(e: LayoutChangeEvent) => setTitleHeight(e.nativeEvent.layout.height)}
                style={[styles.title, { color: theme.text, opacity: titleOpacity }]}
            >
                Block🏐ut
            </Animated.Text>

            <View
                style={styles.tabBarContainer}
                onLayout={(e: LayoutChangeEvent) => setTabHeight(e.nativeEvent.layout.height)}
            >
                <TabBar
                    {...props}
                    indicatorStyle={[styles.indicator, { backgroundColor: theme.text }]}
                    tabStyle={styles.tabStyle}
                    style={styles.tabBar}
                    activeColor={theme.text}
                    inactiveColor={theme.textInactive}
                />

                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => router.navigate("/search")}>
                        <MaterialCommunityIcons name="magnify" size={25} color={theme.text} />
                    </TouchableOpacity>

                    <TouchableOpacity>
                        <MaterialCommunityIcons name="whistle" size={25} color={theme.text} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.navigate("/profile")}>
                        <FastImage style={styles.avatar} source={{ uri: user?.picture }} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 10,
    },
    tabBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        paddingHorizontal: 10,
        paddingTop: 10,
        fontSize: 26,
        fontWeight: "bold",
    },
    tabBar: {
        backgroundColor: "transparent",
    },
    tabStyle: {
        width: "auto",
        paddingHorizontal: 12,
        paddingVertical: 0,
    },
    indicator: {
        width: 0.5,
        height: 3,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingRight: 10,
    },
    avatar: {
        height: 30,
        width: 30,
        borderRadius: 100,
    },
});

export default AnimatedHomeHeader;
