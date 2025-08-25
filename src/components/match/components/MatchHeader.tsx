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
import InfoPill from "@/src/components/common/chips/InfoPill";
import InfoPillGradient from "@/src/components/common/chips/InfoPillGradient";

type HeaderContent = {
    teamALogo: string | null;
    teamBLogo: string | null;
    scoreText: string | null; // si null → on affiche timeText
    timeText: string | null;  // si null & score null → rien
};

type MatchHeaderProps = {
    onOpenReport: () => void;
    scrollY: Animated.Value;
    headerContent?: HeaderContent;
    headerGradient?: readonly [string, string, ...string[]];
};

const LOGO_SIZE = 28;
const LOGO_RADIUS = 8;

const MatchHeader: React.FC<MatchHeaderProps> = ({ onOpenReport, scrollY, headerContent, headerGradient }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Fond plus tôt, contenu tardif
    const BG_FADE_IN_START = 8;
    const BG_FADE_IN_END = 48;
    const APPEAR_START = 72;
    const APPEAR_END = 140;

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

    const elevation = scrollY.interpolate({
        inputRange: [BG_FADE_IN_START, BG_FADE_IN_END],
        outputRange: [0, 4],
        extrapolate: "clamp",
    });

    const BackgroundLayer = (
        <View style={StyleSheet.absoluteFill}>
            {Platform.OS === "ios" ? (
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
                    <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                </Animated.View>
            ) : (
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: theme.background, opacity: bgOpacity, elevation },
                    ]}
                />
            )}

            <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]} pointerEvents="none">
                <LinearGradient
                    colors={[theme.background, "transparent"]}
                    start={{ x: 0, y: 0.35 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );

    // Centre façon MatchScoreCard
    const CenterContent =
        headerContent && headerGradient ? (
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.centerWrap,
                    { opacity: contentOpacity, transform: [{ scale: centerScale }] },
                ]}
            >
                <Animated.View style={{ transform: [{ translateX: leftTranslateX }] }}>
                    <MaskedImage uri={headerContent.teamALogo} size={LOGO_SIZE} radius={LOGO_RADIUS} />
                </Animated.View>

                <View style={styles.centerBlock}>
                    {headerContent.scoreText ? (
                        <>
                            <GradientBorderView
                                gradient={headerGradient}
                                borderRadius={12}
                                borderWidth={1.5}
                                style={[styles.finalScoreBox, { backgroundColor: theme.background }]}
                            >
                                <Text style={[styles.finalScoreText, { color: theme.text }]}>
                                    {headerContent.scoreText}
                                </Text>
                            </GradientBorderView>
                        </>
                    ) : (
                        <InfoPillGradient label="À venir" gradient={headerGradient} />
                    )}
                </View>

                <Animated.View style={{ transform: [{ translateX: rightTranslateX }] }}>
                    <MaskedImage uri={headerContent.teamBLogo} size={LOGO_SIZE} radius={LOGO_RADIUS} />
                </Animated.View>
            </Animated.View>
        ) : null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {BackgroundLayer}

            <View style={styles.header}>
                <TouchableOpacity onPress={router.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={"chevron-back-outline"} size={28} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onOpenReport} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="flag-outline" size={28} color={theme.text} />
                </TouchableOpacity>

                {CenterContent}
            </View>
        </View>
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
        zIndex: 10,
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
    timeLarge: {
        fontSize: 18,
        fontWeight: "800",
    },
});