import React, { useState } from "react";
import {
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
    LayoutChangeEvent,
    Platform,
    useColorScheme,
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
import SearchContainer from "../search/SearchScreen";
import ProfileScreen from "../profile/ProfileScreen";
import RawDivisionMappingsScreen from "../rawDivisionMapping/RawDivisionMappingScreen";
import { useHasScopes } from "@/src/hooks/user/useHasScope";

type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    scrollY: Animated.Value;
    onTitleLayout: (height: number) => void;
    onTabBarLayout: (height: number) => void;
};

const AnimatedHomeHeader: React.FC<HeaderProps> = ({ scrollY, onTitleLayout, onTabBarLayout, ...props }) => {
    const { user } = useAuth0();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { openSheet } = useGlobalBottomSheet();
    const colorSheme = useColorScheme();

    const [titleHeight, setTitleHeight] = useState(0);

    const canAccessRawDivision = useHasScopes([
        "read:raw_division_mapping",
        "update:raw_division_mapping",
    ]);

    const translateY = scrollY.interpolate({
        inputRange: [0, titleHeight],
        outputRange: [0, -titleHeight],
        extrapolate: Extrapolation.CLAMP,
    });

    const titleOpacity = scrollY.interpolate({
        inputRange: [0, titleHeight / 1],
        outputRange: [1, 0],
        extrapolate: Extrapolation.CLAMP,
    });

    const blurOpacity = scrollY.interpolate({
        inputRange: [0, titleHeight / 1],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });

    const titleScale = scrollY.interpolate({
        inputRange: [0, titleHeight],
        outputRange: [1, 2.2],
        extrapolate: Extrapolation.CLAMP,
    });

    const handleSearchPress = () => {
        Haptics.selectionAsync();
        openSheet(<SearchContainer />);
    };

    const handleNotificationPress = () => {
        Haptics.selectionAsync();
        openSheet(<RawDivisionMappingsScreen />);
    };

    const handleProfilePress = () => {
        Haptics.selectionAsync();
        openSheet(<ProfileScreen />);
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
                                opacity: blurOpacity
                            },
                        ]}
                    >
                        <BlurView intensity={50} tint="default" style={StyleSheet.absoluteFill} />
                    </Animated.View>

                    <LinearGradient
                        colors={[theme.background, "transparent"]}
                        start={{ x: 0, y: 0.35 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            )}

            <Animated.View
                onLayout={(e: LayoutChangeEvent) => {
                    const height = e.nativeEvent.layout.height;
                    setTitleHeight(height);
                    onTitleLayout(height);
                }}
                style={{
                    paddingVertical: 10,
                    opacity: titleOpacity,
                    transform: [{ scale: titleScale }],
                }}
            >
                <FastImage
                    source={colorSheme === "dark" ? require("@/assets/images/blockout-logo-with-title-light.png") : require("@/assets/images/blockout-logo-with-title-dark.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
            </Animated.View>

            <View
                style={[styles.tabBarContainer, { backgroundColor: Platform.OS === "android" ? theme.background : "transparent" }]}
                onLayout={(e: LayoutChangeEvent) => onTabBarLayout(e.nativeEvent.layout.height)}
            >
                <TabBar
                    {...props}
                    onTabPress={Haptics.selectionAsync}
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

                    {canAccessRawDivision && (
                        <TouchableOpacity onPress={handleNotificationPress}>
                            <MaterialCommunityIcons name="whistle" size={25} color={theme.text} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={handleProfilePress}>
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
    teamLogo: {
        height: 22,
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
