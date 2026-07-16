import React, { useCallback } from "react";
import {
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    View,
    Linking,
    Text,
} from "react-native";
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
import { APP_TITLE, LOGO_HEIGHT, TABBAR_HEIGHT } from "@/src/theme/globals";
import { withAlpha } from "@/src/utils/utils";
import { useSession } from "@/src/context/SessionProvider";
import { CONFIG } from "@/src/config/config";
import RevenueCatUI from "react-native-purchases-ui";
import InfoPillGradient from "../common/chips/InfoPillGradient";
import { usePurchases } from "@/src/context/PurchasesProvider";
import { GOLD_GRADIENT } from "../common/GradientButton";
import MaskedImage from "@/src/components/common/images/MaskedImage";

type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    scrollYs: Record<string, Animated.Value>;
    androidBackgroundAlpha?: number;
    onOpenReport: () => void;
};

const INSTAGRAM_SIZE = 28;

const AnimatedFeedHeader: React.FC<HeaderProps> = ({
    scrollYs,
    androidBackgroundAlpha = 0.88,
    onOpenReport,
    ...props
}) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { isAuthenticated } = useSession();
    const { isPro, isHydrated } = usePurchases();

    const { routes } = props.navigationState;
    const { position } = props;

    const weights = routes.map((_, i) =>
        position.interpolate({
            inputRange: routes.map((__, idx) => idx),
            outputRange: routes.map((__, idx) => (idx === i ? 1 : 0)),
            extrapolate: "clamp",
        }),
    );

    const progressByRoute = routes.map((r) =>
        (scrollYs[r.key] ?? new Animated.Value(0)).interpolate({
            inputRange: [0, LOGO_HEIGHT],
            outputRange: [0, 1],
            extrapolate: "clamp",
        }),
    );

    const combinedProgress = progressByRoute
        .map((p, i) => Animated.multiply(p, weights[i]))
        .reduce<Animated.AnimatedAddition<number>>(
            (acc, cur) => (acc ? Animated.add(acc, cur) : cur),
            new Animated.Value(0),
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
    const androidTint = withAlpha(theme.background, androidBackgroundAlpha);

    const handleOpenInstagram = useCallback(async () => {
        const url = CONFIG.INSTAGRAM_URL?.trim();
        if (!url) return;
        await Haptics.selectionAsync();
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) await Linking.openURL(url);
    }, []);

    const handleOpenPro = useCallback(async () => {
        await Haptics.selectionAsync();
        await RevenueCatUI.presentPaywall();
    }, []);

    const showUpgradeCta = isAuthenticated && isHydrated && !isPro;

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
                                    { backgroundColor: androidTint, opacity: blurOpacity },
                                ]}
                            />
                            <LinearGradient
                                colors={[androidTint, "transparent"]}
                                start={{ x: 0, y: 0.35 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </>
                    )}
                </View>

                <Animated.View
                    style={[
                        styles.logoRow,
                        {
                            opacity: titleOpacity,
                        },
                    ]}
                >
                    <View style={styles.leftCluster}>
                        <View style={styles.brandRow}>
                            <MaskedImage
                                fallback={require("@/assets/images/blockout-logo-dark.png")}
                                size={26}
                                radius={6}
                            />
                            <Text style={[styles.title, { color: theme.text }]}>
                                {APP_TITLE}
                            </Text>
                        </View>

                        {isHydrated && isPro && (
                            <Text style={[styles.titlePro, { color: theme.gold }]}>
                                Pro
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity onPress={handleOpenInstagram} activeOpacity={0.85}>
                        <MaterialCommunityIcons
                            name="instagram"
                            size={INSTAGRAM_SIZE}
                            color={theme.text}
                        />
                    </TouchableOpacity>
                </Animated.View>

                <View style={styles.tabBarContainer}>
                    <TabBar
                        {...props}
                        onTabPress={Haptics.selectionAsync}
                        indicatorStyle={[styles.indicator, { backgroundColor: theme.text }]}
                        tabStyle={styles.tabStyle}
                        style={styles.tabBar}
                        activeColor={theme.text}
                        inactiveColor={theme.textInactive}
                    />

                    <View style={styles.actions}>
                        {showUpgradeCta && (
                            <View style={{ marginRight: 4 }}>
                                <InfoPillGradient
                                    size="md"
                                    borderWidth={1}
                                    backgroundColor="transparent"
                                    variant="border"
                                    gradient={GOLD_GRADIENT}
                                    leftIcon="rocket-launch-outline"
                                    label="Passer à Pro"
                                    onPress={handleOpenPro}
                                    textColor={theme.gold}
                                    iconColor={theme.gold}
                                    labelStyle={{ color: theme.gold, fontWeight: "900" }}
                                    style={styles.proPill}
                                />
                            </View>
                        )}

                        <TouchableOpacity onPress={onOpenReport}>
                            <MaterialCommunityIcons name="flag-outline" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    container: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },

    logoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 10,
        paddingRight: 10,
        justifyContent: "space-between",
    },

    leftCluster: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexShrink: 1,
    },

    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    title: {
        fontFamily: "Outfit",
        fontSize: 30,
        fontWeight: "900",
    },

    titlePro: {
        fontFamily: "Outfit",
        fontSize: 30,
        fontWeight: "400",
    },
    tabBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    tabBar: { flex: 1, height: TABBAR_HEIGHT, marginLeft: 6, backgroundColor: "transparent" },
    tabStyle: { width: "auto", paddingHorizontal: 4 },
    indicator: { width: 0.5, height: 3 },

    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingRight: 10,
    },

    proPill: { alignSelf: "flex-start", borderRadius: 999 },
    proBadge: {},
});

export default AnimatedFeedHeader;