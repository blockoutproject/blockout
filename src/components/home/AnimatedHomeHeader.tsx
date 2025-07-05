import React, { useRef, useState } from "react";
import {
    TouchableOpacity,
    StyleSheet,
    Animated,
    LayoutChangeEvent,
    Platform,
    useColorScheme,
    View,
} from "react-native";
import FastImage from "react-native-fast-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
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
import SearchContainer from "../search/SearchScreen";
import ProfileScreen from "../profile/ProfileScreen";
import RawDivisionMappingsScreen from "../rawDivisionMapping/RawDivisionMappingScreen";
import DivisionScreen from "../division/DivisionScreen";
import { useHasScopes } from "@/src/hooks/user/useHasScope";

import {
    BottomSheetModal,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "../common/BottomSheetCustomPage";

type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    scrollY: Animated.Value;
    onTitleLayout: (height: number) => void;
    onTabBarLayout: (height: number) => void;
};

const AnimatedHomeHeader: React.FC<HeaderProps> = ({
    scrollY,
    onTitleLayout,
    onTabBarLayout,
    ...props
}) => {
    const { user } = useAuth0();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const colorScheme = useColorScheme();
    const [titleHeight, setTitleHeight] = useState(0);

    const searchSheetRef = useRef<BottomSheetModal>(null);
    const mappingSheetRef = useRef<BottomSheetModal>(null);
    const divisionSheetRef = useRef<BottomSheetModal>(null);
    const profileSheetRef = useRef<BottomSheetModal>(null);

    const canAccessRawDivisionMapping = useHasScopes([
        "read:raw_division_mapping",
        "update:raw_division_mapping",
    ]);

    const canAccessDivision = useHasScopes([
        "read:divisions",
        "update:divisions",
        "create:divisions",
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

    const open = (ref: React.RefObject<BottomSheetModal>) => () => {
        Haptics.selectionAsync();
        ref.current?.present();
    };

    return (
        <>
            <Animated.View
                style={[
                    styles.container,
                    { paddingTop: insets.top, transform: [{ translateY }] },
                ]}
            >
                {Platform.OS === "ios" && (
                    <View style={StyleSheet.absoluteFill}>
                        <Animated.View
                            style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}
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
                        const h = e.nativeEvent.layout.height;
                        setTitleHeight(h);
                        onTitleLayout(h);
                    }}
                    style={{
                        paddingVertical: 10,
                        opacity: titleOpacity,
                        transform: [{ scale: titleScale }],
                    }}
                >
                    <FastImage
                        source={
                            colorScheme === "dark"
                                ? require("@/assets/images/blockout-logo-with-title-light.png")
                                : require("@/assets/images/blockout-logo-with-title-dark.png")
                        }
                        style={styles.teamLogo}
                        resizeMode="contain"
                    />
                </Animated.View>

                <View
                    style={[
                        styles.tabBarContainer,
                        {
                            backgroundColor:
                                Platform.OS === "android" ? theme.background : "transparent",
                        },
                    ]}
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
                        <TouchableOpacity onPress={open(searchSheetRef)}>
                            <MaterialCommunityIcons name="magnify" size={25} color={theme.text} />
                        </TouchableOpacity>

                        {canAccessRawDivisionMapping && (
                            <TouchableOpacity onPress={open(mappingSheetRef)}>
                                <MaterialCommunityIcons name="alpha-m-circle" size={25} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        {canAccessDivision && (
                            <TouchableOpacity onPress={open(divisionSheetRef)}>
                                <MaterialCommunityIcons name="alpha-d-circle" size={25} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={open(profileSheetRef)}>
                            <FastImage style={styles.avatar} source={{ uri: user?.picture }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <BottomSheetCustomPage ref={searchSheetRef}>
                <BottomSheetView style={styles.sheetContent}>
                    <SearchContainer />
                </BottomSheetView>
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={mappingSheetRef}>
                <BottomSheetView style={styles.sheetContent}>
                    <RawDivisionMappingsScreen />
                </BottomSheetView>
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={divisionSheetRef}>
                <BottomSheetView style={styles.sheetContent}>
                    <DivisionScreen />
                </BottomSheetView>
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={profileSheetRef}>
                <BottomSheetView style={styles.sheetContent}>
                    <ProfileScreen />
                </BottomSheetView>
            </BottomSheetCustomPage>
        </>
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
    tabBar: { backgroundColor: "transparent" },
    tabStyle: { width: "auto", paddingHorizontal: 16 },
    indicator: { width: 0.5, height: 3 },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingRight: 10,
    },
    avatar: { height: 30, width: 30, borderRadius: 100 },
    sheetContent: { flex: 1 },
});

export default AnimatedHomeHeader;