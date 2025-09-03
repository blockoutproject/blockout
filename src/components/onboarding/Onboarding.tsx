import React, { useMemo, useRef, useState } from "react";
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSpring,
    Extrapolation,
    SharedValue,
    runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { OnboardingStep } from "@/src/onboarding/Steps";

const { width: SCREEN_W } = Dimensions.get("window");

type Props = {
    steps: OnboardingStep[];
    onComplete: () => void;
    onSkip?: () => void;
    style?: ViewStyle;
    primaryText?: string;
    nextText?: string;
    backText?: string;
    skipText?: string;
};

export function FancyOnboarding({
    steps,
    onComplete,
    onSkip,
    style,
    primaryText = "C’est parti !",
    nextText = "Suivant",
    backText = "Précédent",
    skipText = "Passer",
}: Props) {
    const [index, setIndex] = useState(0);
    const isFirst = index === 0;
    const isLast = index === steps.length - 1;

    const svX = useSharedValue(0);
    const scrollRef = useAnimatedRef<Animated.ScrollView>();

    // ── Scroll handler (Reanimated) ────────────────────────────────────────────────
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            svX.value = e.contentOffset.x;
        },
    });

    // ── Pan gesture (swipe “free”, au-dessus de la scroll) ────────────────────────
    const dragX = useSharedValue(0);
    const jsGoTo = (i: number) => goTo(i); // alias clair côté JS

    const pan = Gesture.Pan()
        .onEnd((e) => {
            const should = Math.abs(e.translationX) > SCREEN_W * 0.25 || Math.abs(e.velocityX) > 600;
            if (should) {
                if (e.translationX < 0 && !isLast) {
                    runOnJS(jsGoTo)(index + 1);
                } else if (e.translationX > 0 && !isFirst) {
                    runOnJS(jsGoTo)(index - 1);
                }
            }
            dragX.value = withSpring(0);
        });

    const dragStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dragX.value * 0.08 }],
    }));

    const bgStyle = useAnimatedStyle(() => {
        const colors = steps.map((s) => s.bg);
        const input = steps.map((_, i) => i * SCREEN_W);
        return {
            backgroundColor: interpolateColor(svX.value, input, colors),
        };
    });

    useDerivedValue(() => {
        const next = Math.round(svX.value / SCREEN_W);
        if (next !== index) {
            runOnJS(setIndex)(next);
        }
    });

    const goTo = (i: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        // @ts-ignore
        scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
        setIndex(i);
    };

    const onNext = () => {
        if (isLast) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            onComplete();
        } else {
            goTo(index + 1);
        }
    };

    const onBack = () => !isFirst && goTo(index - 1);
    const onSkipPress = () => {
        Haptics.selectionAsync().catch(() => { });
        onSkip ? onSkip() : onComplete();
    };

    return (
        <Animated.View style={[styles.root, bgStyle, style]}>
            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.flex, dragStyle]}>
                    <Animated.ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={{ alignItems: "stretch" }}
                        onMomentumScrollEnd={(e) => {
                            const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                            setIndex(i);
                        }}
                    >
                        {steps.map((step, i) => (
                            <Slide key={step.id} step={step} i={i} svX={svX} />
                        ))}
                    </Animated.ScrollView>
                </Animated.View>
            </GestureDetector>

            {/* Dots + Skip */}
            <View style={styles.topBar}>
                <Dots steps={steps} svX={svX} />
                {!isLast && (
                    <Pressable onPress={onSkipPress} hitSlop={8} style={styles.skipBtn}>
                        <Text style={styles.skipTxt}>{skipText}</Text>
                    </Pressable>
                )}
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                {!isFirst ? (
                    <GhostButton label={backText} onPress={onBack} />
                ) : (
                    <View style={{ flex: 1 }} />
                )}
                <WowButton
                    label={isLast ? primaryText : nextText}
                    onPress={onNext}
                    fullWidth={isFirst}
                />
            </View>
        </Animated.View>
    );
}

// ────────────────────────────────────────────────────────────────────────────────
// Slide: parallax visuel + cross-fade/slide des textes
// ────────────────────────────────────────────────────────────────────────────────
const IMAGE_SIZE = 200; // même taille pour logo et gif

const Slide = ({
    step,
    i,
    svX,
}: {
    step: OnboardingStep;
    i: number;
    svX: SharedValue<number>;
}) => {
    const base = i * SCREEN_W;

    const imgParallax = useAnimatedStyle(() => {
        const progress = (svX.value - base) / SCREEN_W; // 0 au centre
        const translateX = interpolate(progress, [-1, 0, 1], [-40, 0, 40], Extrapolation.CLAMP);
        const scale = interpolate(progress, [-1, 0, 1], [0.92, 1, 0.92], Extrapolation.CLAMP);
        const opacity = interpolate(progress, [-0.8, 0, 0.8], [0.2, 1, 0.2], Extrapolation.CLAMP);
        return { transform: [{ translateX }, { scale }], opacity };
    });

    const titleStyle = useAnimatedStyle(() => {
        const progress = (svX.value - base) / SCREEN_W;
        const translateY = interpolate(progress, [-1, 0, 1], [20, 0, -20], Extrapolation.CLAMP);
        const opacity = interpolate(progress, [-0.6, 0, 0.6], [0, 1, 0], Extrapolation.CLAMP);
        return { transform: [{ translateY }], opacity };
    });

    const descStyle = useAnimatedStyle(() => {
        const progress = (svX.value - base) / SCREEN_W;
        const translateY = interpolate(progress, [-1, 0, 1], [10, 0, -10], Extrapolation.CLAMP);
        const opacity = interpolate(progress, [-0.5, 0, 0.5], [0, 1, 0], Extrapolation.CLAMP);
        return { transform: [{ translateY }], opacity };
    });

    const visualSource = step.visual.gif ?? step.visual.image;

    return (
        <View style={[styles.slide, { width: SCREEN_W }]}>
            <Animated.View style={[styles.visual, imgParallax]}>
                {step.visual.component ? (
                    <View>{step.visual.component}</View>
                ) : visualSource ? (
                    <Image
                        source={visualSource}
                        style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 24 }}
                        contentFit="cover"
                        transition={300}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }} />
                )}
            </Animated.View>

            <Animated.Text style={[styles.title, titleStyle]}>
                {step.title}
            </Animated.Text>
            <Animated.Text style={[styles.desc, descStyle]}>
                {step.description}
            </Animated.Text>

            {step.id === "push" && <FakePermissionCard />}
        </View>
    );
};

// ────────────────────────────────────────────────────────────────────────────────
// Dots animés: largeur + opacité interpolées sur le scroll
// ────────────────────────────────────────────────────────────────────────────────
const Dots = ({ steps, svX }: { steps: OnboardingStep[]; svX: SharedValue<number> }) => {
    return (
        <View style={styles.dotsRow}>
            {steps.map((_, i) => {
                const input = steps.map((__, j) => j * SCREEN_W);
                const dotStyle = useAnimatedStyle(() => {
                    const w = interpolate(
                        svX.value,
                        input,
                        input.map((x, j) => (j === i ? 22 : 8))
                    );
                    const o = interpolate(
                        svX.value,
                        input,
                        input.map((x, j) => (j === i ? 1 : 0.35))
                    );
                    return { width: w, opacity: o };
                });
                return <Animated.View key={i} style={[styles.dot, dotStyle]} />;
            })}
        </View>
    );
};

// ────────────────────────────────────────────────────────────────────────────────
// Boutons
// ────────────────────────────────────────────────────────────────────────────────
const WowButton = ({
    label,
    onPress,
    fullWidth,
}: {
    label: string;
    onPress: () => void;
    fullWidth?: boolean;
}) => {
    const scale = useSharedValue(1);
    const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
        <Animated.View style={[fullWidth ? styles.btnFull : { flex: 2 }, s]}>
            <Pressable
                onPressIn={() => (scale.value = withSpring(0.98))}
                onPressOut={() => (scale.value = withSpring(1))}
                onPress={onPress}
                style={styles.wowBtn}
            >
                <Text style={styles.wowTxt}>{label}</Text>
            </Pressable>
        </Animated.View>
    );
};

const GhostButton = ({
    label,
    onPress,
}: {
    label: string;
    onPress: () => void;
}) => {
    const scale = useSharedValue(1);
    const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
        <Animated.View style={[{ flex: 1 }, s]}>
            <Pressable
                onPressIn={() => (scale.value = withSpring(0.98))}
                onPressOut={() => (scale.value = withSpring(1))}
                onPress={onPress}
                style={styles.ghostBtn}
            >
                <Text style={styles.ghostTxt}>{label}</Text>
            </Pressable>
        </Animated.View>
    );
};

// ────────────────────────────────────────────────────────────────────────────────
// Carte “permission notifications” (visuelle, sans logique système)
// ────────────────────────────────────────────────────────────────────────────────
const FakePermissionCard = () => {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardDesc}>
                Active-les pour recevoir des alertes quand tes équipes suivies ont de nouveaux matchs.
            </Text>
            <View style={styles.pill}>
                <View style={styles.bullet} />
                <Text style={styles.pillTxt}>Prévenir avant le match</Text>
            </View>
            <View style={styles.pill}>
                <View style={styles.bullet} />
                <Text style={styles.pillTxt}>Récap hebdo des résultats</Text>
            </View>
        </View>
    );
};

// ────────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    slide: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    visual: {
        marginBottom: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
        color: "#fff",
        textAlign: "center",
        marginBottom: 12,
    },
    desc: {
        fontSize: 15,
        fontWeight: "600",
        color: "rgba(255,255,255,0.9)",
        textAlign: "center",
        lineHeight: 22,
        maxWidth: 360,
        marginBottom: 28,
    },

    topBar: {
        position: "absolute",
        top: Platform.select({ ios: 54, android: 34, default: 24 }),
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    skipBtn: {
        position: "absolute",
        right: 16,
        padding: 8,
    },
    skipTxt: {
        color: "rgba(255,255,255,0.85)",
        fontWeight: "800",
        textDecorationLine: "underline",
    },

    dotsRow: {
        height: 26,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dot: {
        height: 8,
        borderRadius: 999,
        backgroundColor: "#fff",
    },

    controls: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 32,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    wowBtn: {
        height: 54,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        // gradient simple “flat” sans lib: on reste neutre; plug ton <GradientButton/> si tu veux
        backgroundColor: "#7dd3fc",
    },
    wowTxt: {
        fontSize: 15,
        fontWeight: "900",
        color: "#000",
    },
    btnFull: { flex: 1 },

    ghostBtn: {
        height: 54,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.35)",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    ghostTxt: {
        fontSize: 14,
        fontWeight: "800",
        color: "#fff",
    },

    card: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 16,
        padding: 16,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.15)",
        marginTop: 4,
    },
    cardTitle: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 16,
        marginBottom: 6,
    },
    cardDesc: {
        color: "rgba(255,255,255,0.9)",
        fontWeight: "600",
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 6,
        backgroundColor: "#fff",
    },
    pillTxt: {
        color: "#fff",
        fontWeight: "700",
    },
});