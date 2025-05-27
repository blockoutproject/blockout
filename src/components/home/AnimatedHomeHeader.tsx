import React, { useState } from "react";
import {
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
    LayoutChangeEvent,
    Platform,
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
import { Extrapolation } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useGlobalBottomSheet } from "@/src/context/GlobalBottomSheetProvider";
import SearchContainer from "../search/SearchContainer";

type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    scrollY: Animated.Value;
    onTitleLayout: (height: number) => void;
    onTabBarLayout: (height: number) => void;
};

const AnimatedHomeHeader: React.FC<HeaderProps> = ({ scrollY, onTitleLayout, onTabBarLayout, ...props }) => {
    const router = useRouter();
    const { user } = useAuth0();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { openSheet } = useGlobalBottomSheet();

    const [titleHeight, setTitleHeight] = useState(0);

    const translateY = scrollY.interpolate({
        inputRange: [0, titleHeight],
        outputRange: [0, -titleHeight],
        extrapolate: Extrapolation.CLAMP,
    });

    const titleOpacity = scrollY.interpolate({
        inputRange: [0, titleHeight / 1.5],
        outputRange: [1, 0],
        extrapolate: Extrapolation.CLAMP,
    });

    const handleSearchPress = () => {
        Haptics.selectionAsync();
        openSheet(<SearchContainer />);
    };

    return (
        <Animated.View
            style={[styles.container, { paddingTop: insets.top, transform: [{ translateY }] }]}
        >
            {Platform.OS === "ios" && (
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
                        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                    </Animated.View>

                    <LinearGradient
                        colors={[theme.background, "transparent"]}
                        start={{ x: 0, y: 0.35 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            )}

            <Animated.Text
                onLayout={(e: LayoutChangeEvent) => {
                    const height = e.nativeEvent.layout.height;
                    setTitleHeight(height);
                    onTitleLayout(height);
                }}
                style={[styles.title, { color: theme.text, opacity: titleOpacity }]}
            >
                Block🏐ut
            </Animated.Text>

            <View
                style={[styles.tabBarContainer, { backgroundColor: Platform.OS === "android" ? theme.background : "transparent" }]}
                onLayout={(e: LayoutChangeEvent) => onTabBarLayout(e.nativeEvent.layout.height)}
            >
                <TabBar
                    {...props}
                    indicatorStyle={[styles.indicator, { backgroundColor: theme.text }]}
                    tabStyle={styles.tabStyle}
                    style={styles.tabBar}
                    activeColor={theme.text}
                    inactiveColor={theme.textInactive}
                    android_ripple={{ color: "transparent" }}
                />

                <View style={styles.actions}>
                    <TouchableOpacity onPress={handleSearchPress}>
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
    },
    tabBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        paddingHorizontal: 16,
        paddingTop: 10,
        fontSize: 26,
        fontWeight: "bold",
    },
    tabBar: {
        backgroundColor: "transparent",
    },
    tabStyle: {
        width: "auto",
        paddingHorizontal: 16,
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
