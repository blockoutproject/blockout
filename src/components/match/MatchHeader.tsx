import React from "react";
import { TouchableOpacity, View, StyleSheet, Animated, Platform, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import InfoPillGradient from "@/src/components/common/chips/InfoPillGradient";
import { withAlpha } from "@/src/utils/utils";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { he } from "date-fns/locale";

/** Header content rendered over the scroll view. */
export type HeaderContent = {
    /** Team A logo url. */
    teamALogo: string | null;
    /** Team B logo url. */
    teamBLogo: string | null;
    /** Final score text (e.g., "3-1"). */
    scoreText: string | null;
    /** Time text for upcoming match. */
    timeText: string | null;
    season: string;
    poolCode: string;
    leagueCode: string;
};

/** Props for the match header. */
export type MatchHeaderProps = {
    /** Callback to open the report modal. */
    onOpenReport: () => void;
    /** Scroll animated value. */
    scrollY: Animated.Value;
    /** Optional header content. */
    headerContent: HeaderContent;
    /** Gradient colors for the header widgets. */
    headerGradient?: readonly [string, string, ...string[]];
};

const LOGO_SIZE = 28;
const LOGO_RADIUS = 8;

const MatchHeader: React.FC<MatchHeaderProps> = ({ onOpenReport, scrollY, headerContent, headerGradient }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const BG_FADE_IN_START = 8;
    const BG_FADE_IN_END = 48;
    const APPEAR_START = 72;
    const APPEAR_END = 140;

    const handleOpenFfvbCalendar = async () => {
        try {
            const { season, leagueCode, poolCode } = headerContent;

            if (!season || !leagueCode || !poolCode) {
                console.warn("handleOpenFfvbCalendar: paramètres manquants");
                return;
            }

            await Haptics.selectionAsync();

            const query = new URLSearchParams({
                saison: season,
                codent: leagueCode,
                poule: poolCode,
            }).toString();

            const url = `https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?${query}`;

            await WebBrowser.openBrowserAsync(url, {
                enableBarCollapsing: true,
                showTitle: true,
            });
        } catch (err) {
            console.error("[FFVB] Erreur ouverture calendrier :", err);
        }
    };

    const bgOpacity = scrollY.interpolate({
        inputRange: [0, BG_FADE_IN_START, BG_FADE_IN_END],
        outputRange: [0, 0.5, 1],
        extrapolate: "clamp",
    });

    const contentOpacity = scrollY.interpolate({
        inputRange: [APPEAR_START, APPEAR_END],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });

    const leftTranslateX = scrollY.interpolate({
        inputRange: [APPEAR_START, APPEAR_END],
        outputRange: [-12, 0],
        extrapolate: "clamp",
    });

    const rightTranslateX = scrollY.interpolate({
        inputRange: [APPEAR_START, APPEAR_END],
        outputRange: [12, 0],
        extrapolate: "clamp",
    });

    const centerScale = scrollY.interpolate({
        inputRange: [APPEAR_START, APPEAR_END],
        outputRange: [0.92, 1],
        extrapolate: "clamp",
    });

    const containerElevation = scrollY.interpolate({
        inputRange: [BG_FADE_IN_START, BG_FADE_IN_END],
        outputRange: [0, 4],
        extrapolate: "clamp",
    });

    const androidTint = withAlpha(theme.background, 0.88);

    const BackgroundLayer = (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                {
                    opacity: bgOpacity,
                    zIndex: 0,
                },
            ]}
            pointerEvents="none"
        >
            {Platform.OS === "ios" ? (
                <BlurView
                    intensity={50}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
            ) : (
                <>
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: androidTint,
                            },
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
            <LinearGradient
                colors={[theme.background, "transparent"]}
                start={{ x: 0, y: 0.35 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );

    const CenterContent =
        headerContent && headerGradient ? (
            <Animated.View
                pointerEvents="none"
                needsOffscreenAlphaCompositing
                renderToHardwareTextureAndroid
                style={[
                    styles.centerWrap,
                    {
                        opacity: contentOpacity,
                        transform: [{ scale: centerScale }],
                        zIndex: 2,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        {
                            transform: [{ translateX: leftTranslateX }],
                        },
                    ]}
                >
                    <MaskedImage
                        uri={headerContent.teamALogo}
                        size={LOGO_SIZE}
                        radius={LOGO_RADIUS}
                    />
                </Animated.View>

                <View
                    style={styles.centerBlock}
                >
                    {headerContent.scoreText ? (
                        <GradientBorderView
                            gradient={headerGradient}
                            borderRadius={12}
                            borderWidth={2}
                            style={[
                                styles.finalScoreBox,
                                {
                                    backgroundColor: theme.background,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.finalScoreText,
                                    {
                                        color: theme.text,
                                    },
                                ]}
                            >
                                {headerContent.scoreText}
                            </Text>
                        </GradientBorderView>
                    ) : (
                        <InfoPillGradient
                            label="À venir"
                            gradient={headerGradient}
                        />
                    )}
                </View>

                <Animated.View
                    style={[
                        {
                            transform: [{ translateX: rightTranslateX }],
                        },
                    ]}
                >
                    <MaskedImage
                        uri={headerContent.teamBLogo}
                        size={LOGO_SIZE}
                        radius={LOGO_RADIUS}
                    />
                </Animated.View>
            </Animated.View>
        ) : null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    zIndex: 1,
                },
                Platform.OS === "android"
                    ? {
                        elevation: containerElevation,
                    }
                    : null,
            ]}
            collapsable={false}
            testID="match-header"
        >
            {BackgroundLayer}

            <View
                style={[
                    styles.header,
                    {
                        zIndex: 2,
                    },
                ]}
            >
                <TouchableOpacity
                    onPress={router.back}
                    hitSlop={{
                        top: 8,
                        bottom: 8,
                        left: 8,
                        right: 8,
                    }}
                >
                    <Ionicons
                        name={"chevron-back-outline"}
                        size={28}
                        color={theme.text}
                    />
                </TouchableOpacity>
                <View style={styles.rightGroup}>
                    <MaskedImage
                        fallback={require("@/assets/images/ffvb-logo.png")}
                        size={28}
                        radius={6}
                        onPress={handleOpenFfvbCalendar}
                        shadow
                    />
                    <TouchableOpacity
                        onPress={onOpenReport}
                        hitSlop={{
                            top: 8,
                            bottom: 8,
                            left: 8,
                            right: 8,
                        }}
                    >
                        <MaterialCommunityIcons
                            name="flag-outline"
                            size={28}
                            color={theme.text}
                        />
                    </TouchableOpacity>
                </View>
                {CenterContent}
            </View>
        </Animated.View>
    );
};

export default MatchHeader;

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },
    rightGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
    centerWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 56,
    },
    centerBlock: {
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    finalScoreBox: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    finalScoreText: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
});