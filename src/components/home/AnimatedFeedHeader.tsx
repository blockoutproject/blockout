import React, { useRef } from "react";
import {
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import RawDivisionMappingsScreen from "../rawDivisionMapping/RawDivisionMappingScreen";
import DivisionScreen from "../division/DivisionScreen";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "../common/bottomSheet/BottomSheetCustomPage";
import AdminScreen from "../appStatus/AdminScreen";
import { LOGO_HEIGHT, TABBAR_HEIGHT } from "@/src/theme/globals";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import { withAlpha } from "@/src/utils/utils";
import { useSession } from "@/src/context/SessionProvider";
import LiveLinkModerationScreen from "../match/moderation/MatchLiveModerationScreen";
import MatchLiveModerationScreen from "../match/moderation/MatchLiveModerationScreen";

type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    scrollYs: Record<string, Animated.Value>;
    androidBackgroundAlpha?: number;
    onOpenReport: () => void;
};

const AnimatedFeedHeader: React.FC<HeaderProps> = ({
    scrollYs,
    androidBackgroundAlpha = 0.88,
    onOpenReport,
    ...props
}) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { isMaintenance } = useSession();

    const liveLinkModerationSheetRef = useRef<BottomSheetModal>(null);
    const mappingSheetRef = useRef<BottomSheetModal>(null);
    const divisionSheetRef = useRef<BottomSheetModal>(null);
    const scraperSheetRef = useRef<BottomSheetModal>(null);

    const { allowed: canAccessLiveLinkModeration } = useHasScopes([
        "moderate:match_live_link",
    ]);


    const { allowed: canAccessRawDivisionMappings } = useHasScopes([
        "read:raw_division_mapping",
        "update:raw_division_mapping",
    ]);

    const { allowed: canAccessDivisions } = useHasScopes([
        "read:divisions",
        "update:divisions",
        "create:divisions",
    ]);

    const { allowed: canAdminManagement } = useHasScopes([
        "read:scrapers",
        "update:scrapers",
        "update:maintenance"
    ]);

    const { routes } = props.navigationState;
    const { position } = props;

    const weights = routes.map((_, i) =>
        position.interpolate({
            inputRange: routes.map((__, idx) => idx),
            outputRange: routes.map((__, idx) => (idx === i ? 1 : 0)),
            extrapolate: "clamp",
        })
    );

    const progressByRoute = routes.map((r) =>
        (scrollYs[r.key] ?? new Animated.Value(0)).interpolate({
            inputRange: [0, LOGO_HEIGHT],
            outputRange: [0, 1],
            extrapolate: "clamp",
        })
    );

    const combinedProgress = progressByRoute
        .map((p, i) => Animated.multiply(p, weights[i]))
        .reduce<Animated.AnimatedAddition<number>>(
            (acc, cur) => (acc ? Animated.add(acc, cur) : cur),
            new Animated.Value(0)
        );

    const translateY = combinedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -LOGO_HEIGHT],
        extrapolate: "clamp",
    });

    const titleOpacity = combinedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    const blurOpacity = combinedProgress;

    const openLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => {
        Haptics.selectionAsync();
        ref.current?.present();
    };

    const androidTint = withAlpha(theme.background, androidBackgroundAlpha);

    return (
        <>
            <Animated.View
                style={[
                    styles.container,
                    { paddingTop: insets.top, transform: [{ translateY }] },
                ]}
            >
                <View style={StyleSheet.absoluteFill}>
                    {Platform.OS === "ios" ? (
                        <>
                            <Animated.View style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}>
                                <BlurView intensity={50} tint="default" style={StyleSheet.absoluteFill} />
                            </Animated.View>
                            <LinearGradient
                                colors={[theme.background, "transparent"]}
                                start={{ x: 0, y: 0.35 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </>
                    ) : (
                        <>
                            <Animated.View
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor: androidTint,
                                        opacity: blurOpacity,
                                    },
                                ]}
                            />
                            <LinearGradient
                                colors={[androidTint, "transparent"]}
                                start={{ x: 0, y: 0.35 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                        </>
                    )}
                </View>

                <Animated.View
                    style={{
                        height: LOGO_HEIGHT,
                        opacity: titleOpacity,
                        justifyContent: "center",
                        alignItems: "flex-start",
                        paddingLeft: 16,
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
                            backgroundColor: Platform.OS === "android" ? "transparent" : "transparent",
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
                        {canAccessLiveLinkModeration && (
                            <TouchableOpacity onPress={openLocal(liveLinkModerationSheetRef)}>
                                <MaterialCommunityIcons name="alpha-m-circle" size={28} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        {canAccessRawDivisionMappings && (
                            <TouchableOpacity onPress={openLocal(mappingSheetRef)}>
                                <MaterialCommunityIcons name="alpha-m-circle" size={28} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        {canAccessDivisions && (
                            <TouchableOpacity onPress={openLocal(divisionSheetRef)}>
                                <MaterialCommunityIcons name="alpha-d-circle" size={28} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        {canAdminManagement && (
                            <TouchableOpacity onPress={openLocal(scraperSheetRef)}>
                                <MaterialCommunityIcons name="power-standby" size={28} color={isMaintenance ? theme.error : theme.text} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={onOpenReport}>
                            <MaterialCommunityIcons name="flag-outline" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <BottomSheetCustomPage ref={liveLinkModerationSheetRef}>
                <MatchLiveModerationScreen />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={mappingSheetRef}>
                <RawDivisionMappingsScreen />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={divisionSheetRef}>
                <DivisionScreen />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={scraperSheetRef}>
                <AdminScreen />
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
    tabBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    tabBar: {
        flex: 1,
        marginLeft: 6,
        height: TABBAR_HEIGHT,
        backgroundColor: "transparent",
    },
    tabStyle: {
        width: "auto",
        paddingHorizontal: 4,
    },
    teamLogo: { flex: 1, aspectRatio: 5 },
    indicator: { width: 0.5, height: 3 },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingRight: 10,
    },
    iconBtn: {
        padding: 4,
    },
});

export default AnimatedFeedHeader;