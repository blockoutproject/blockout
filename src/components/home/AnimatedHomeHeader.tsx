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
import BottomSheetCustomPage from "../common/BottomSheetCustomPage";
import ScraperStatusScreen from "../scraper/ScraperStatusScreen";
import BottomSheetCustomModal from "../common/BottomSheetCustomModal";
import { LOGO_HEIGHT, TABBAR_HEIGHT } from "@/src/theme/globals";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import { withAlpha } from "@/src/utils/utils";

type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    scrollYs: Record<string, Animated.Value>;
    androidBackgroundAlpha?: number;
};

const AnimatedHomeHeader: React.FC<HeaderProps> = ({
    scrollYs,
    androidBackgroundAlpha = 0.88,
    ...props
}) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    const mappingSheetRef = useRef<BottomSheetModal>(null);
    const divisionSheetRef = useRef<BottomSheetModal>(null);
    const scraperSheetRef = useRef<BottomSheetModal>(null);

    const { allowed: canAccessRawDivisionMappings } = useHasScopes([
        "read:raw_division_mapping",
        "update:raw_division_mapping",
    ]);

    const { allowed: canAccessDivisions } = useHasScopes([
        "read:divisions",
        "update:divisions",
        "create:divisions",
    ]);

    const { allowed: canAccessScrapersManagement } = useHasScopes([
        "read:scrapers",
        "update:scrapers",
    ]);

    const { routes } = props.navigationState;
    const { position } = props;

    // Poids par route (1 pour la route visible, 0 sinon)
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
            inputRange: [0, LOGO_HEIGHT],
            outputRange: [0, 1],
            extrapolate: "clamp",
        })
    );

    // Somme pondérée → progression combinée (0→1)
    const combinedProgress = progressByRoute
        .map((p, i) => Animated.multiply(p, weights[i]))
        .reduce<Animated.AnimatedAddition<number>>(
            (acc, cur) => (acc ? Animated.add(acc, cur) : cur),
            new Animated.Value(0)
        );

    // Dérivés
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

    const titleScale = combinedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2],
        extrapolate: "clamp",
    });

    const openLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => {
        Haptics.selectionAsync();
        ref.current?.present();
    };

    // ✅ Fond Android semi-transparent dérivé du thème (pas noir “brut”)
    const androidTint = withAlpha(theme.background, androidBackgroundAlpha);

    return (
        <>
            <Animated.View
                style={[
                    styles.container,
                    { paddingTop: insets.top, transform: [{ translateY }] },
                ]}
            >
                {/* iOS : blur animé + gradient.
            Android : overlay colorisé semi-transparent + le même gradient pour adoucir */}
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
                                        // 🎯 teinte issue du thème + opacité douce
                                        backgroundColor: androidTint,
                                        opacity: blurOpacity, // suit la progression comme iOS
                                    },
                                ]}
                            />
                            <LinearGradient
                                // Gradient identique pour lisser la jonction haut/centre
                                colors={[androidTint, "transparent"]}
                                start={{ x: 0, y: 0.35 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                        </>
                    )}
                </View>

                {/* Logo animé (échelle + fade out) */}
                <Animated.View
                    style={{
                        height: LOGO_HEIGHT,
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

                {/* TabBar + actions */}
                <View
                    style={[
                        styles.tabBarContainer,
                        {
                            // Android : on laisse la surface principale transparente, l’overlay s’occupe du fond
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
                    </View>
                </View>
            </Animated.View>

            <BottomSheetCustomPage ref={mappingSheetRef}>
                <RawDivisionMappingsScreen />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={divisionSheetRef}>
                <DivisionScreen />
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
        height: TABBAR_HEIGHT,
        backgroundColor: "transparent",
    },
    tabStyle: {
        width: "auto",
        paddingHorizontal: 16,
    },
    teamLogo: { height: 22 },
    indicator: { width: 0.5, height: 3 },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingRight: 10,
    },
});

export default AnimatedHomeHeader;