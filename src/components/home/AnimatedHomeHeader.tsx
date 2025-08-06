// AnimatedHomeHeader.tsx
import React, { useRef } from "react";
import {
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    View,
} from "react-native";
import { Image } from "expo-image";
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
import * as Haptics from "expo-haptics";
import ProfileScreen from "../profile/ProfileScreen";
import RawDivisionMappingsScreen from "../rawDivisionMapping/RawDivisionMappingScreen";
import DivisionScreen from "../division/DivisionScreen";
import { useHasScopes } from "@/src/hooks/user/useHasScope";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "../common/BottomSheetCustomPage";
import ScraperStatusScreen from "../scraper/ScraperStatusScreen";
import BottomSheetCustomModal from "../common/BottomSheetCustomModal";
import { useSheet } from "@/src/context/SheetProvider";
import { HEADER_HEIGHT, TABBAR_HEIGHT } from "@/src/theme/globals";

// 🔁 On attend maintenant un mapping scrollYs (un Animated.Value par tab)
type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    scrollYs: Record<string, Animated.Value>;
};

const AnimatedHomeHeader: React.FC<HeaderProps> = ({ scrollYs, ...props }) => {
    const { user } = useAuth0();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { open } = useSheet();

    const mappingSheetRef = useRef<BottomSheetModal>(null);
    const divisionSheetRef = useRef<BottomSheetModal>(null);
    const profileSheetRef = useRef<BottomSheetModal>(null);
    const scraperSheetRef = useRef<BottomSheetModal>(null);

    const canAccessRawDivisionMappings = useHasScopes([
        "read:raw_division_mapping",
        "update:raw_division_mapping",
    ]);

    const canAccessDivisions = useHasScopes([
        "read:divisions",
        "update:divisions",
        "create:divisions",
    ]);

    const canAccessScrapersManagement = useHasScopes([
        "read:scrapers",
        "update:scrapers",
    ]);

    const { routes } = props.navigationState;
    const { position } = props;

    // Poids par route en fonction de la position (1 pour la route visible, 0 pour les autres)
    const weights = routes.map((_, i) =>
        position.interpolate({
            inputRange: routes.map((__, idx) => idx),
            outputRange: routes.map((__, idx) => (idx === i ? 1 : 0)),
            extrapolate: "clamp",
        })
    );

    // Progression verticale (0→1) pour chaque route via son scrollY
    const progressByRoute = routes.map((r) =>
        (scrollYs[r.key] ?? new Animated.Value(0)).interpolate({
            inputRange: [0, HEADER_HEIGHT],
            outputRange: [0, 1],
            extrapolate: "clamp",
        })
    );

    // Somme pondérée = progression combinée (0→1) sur laquelle on drive le header
    const combinedProgress = progressByRoute
        .map((p, i) => Animated.multiply(p, weights[i]))
        .reduce<Animated.AnimatedAddition<number>>((acc, cur) => (acc ? Animated.add(acc, cur) : cur), new Animated.Value(0));

    // Dérivés : translate/opacity/scale/blur
    const translateY = combinedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -HEADER_HEIGHT],
        extrapolate: "clamp",
    });

    const titleOpacity = combinedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    const blurOpacity = combinedProgress; // 0 -> 1

    const titleScale = combinedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.2],
        extrapolate: "clamp",
    });

    const openLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => {
        Haptics.selectionAsync();
        ref.current?.present();
    };

    const onSearchPress = () => {
        Haptics.selectionAsync();
        open("Search", {});
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
                    style={{
                        paddingVertical: 10,
                        opacity: titleOpacity,
                        transform: [{ scale: titleScale }],
                    }}
                >
                    <Image
                        source={require("@/assets/images/blockout-logo-with-title-light.png")}
                        style={styles.teamLogo}
                        contentFit="contain"
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
                        <TouchableOpacity onPress={onSearchPress}>
                            <MaterialCommunityIcons name="magnify" size={25} color={theme.text} />
                        </TouchableOpacity>

                        {canAccessRawDivisionMappings && (
                            <TouchableOpacity onPress={openLocal(mappingSheetRef)}>
                                <MaterialCommunityIcons name="alpha-m-circle" size={25} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        {canAccessDivisions && (
                            <TouchableOpacity onPress={openLocal(divisionSheetRef)}>
                                <MaterialCommunityIcons name="alpha-d-circle" size={25} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        {canAccessScrapersManagement && (
                            <TouchableOpacity onPress={openLocal(scraperSheetRef)}>
                                <MaterialCommunityIcons name="power-standby" size={25} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={openLocal(profileSheetRef)}>
                            <Image style={styles.avatar} source={{ uri: user?.picture }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <BottomSheetCustomPage ref={mappingSheetRef}>
                <RawDivisionMappingsScreen />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={divisionSheetRef}>
                <DivisionScreen />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={profileSheetRef}>
                <ProfileScreen />
            </BottomSheetCustomPage>

            <BottomSheetCustomModal ref={scraperSheetRef}>
                <ScraperStatusScreen />
            </BottomSheetCustomModal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0, left: 0, right: 0,
        zIndex: 10,
    },
    teamLogo: { height: 22 },
    tabBarContainer: {
        height: TABBAR_HEIGHT,
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
});

export default AnimatedHomeHeader;