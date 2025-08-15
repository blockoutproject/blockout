import React, { useRef, useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    View,
    Text,
    Pressable,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";

const { width: W } = Dimensions.get("window");

export type EmojiStep = {
    id: string;
    emoji: string;            // 👉 Ex: "🏐", "📊", "⚡️"
    title: string;
    description: string;
    accent?: string;          // couleur d’accent facultative (sinon thème)
};

type Props = {
    steps: EmojiStep[];
    onComplete: () => void;
    onSkip?: () => void;
    showSkip?: boolean;
    showProgress?: boolean;
    nextLabel?: string;
    backLabel?: string;
    doneLabel?: string;
};

const DOT = 8;

const Onboarding: React.FC<Props> = ({
    steps,
    onComplete,
    onSkip,
    showSkip = true,
    showProgress = true,
    nextLabel = "Suivant",
    backLabel = "Retour",
    doneLabel = "C’est parti",
}) => {
    const theme = useAppTheme();
    const [index, setIndex] = useState(0);
    const ref = useRef<ScrollView>(null);

    const isFirst = index === 0;
    const isLast = index === steps.length - 1;

    const go = async (to: number) => {
        await Haptics.selectionAsync();
        setIndex(to);
        ref.current?.scrollTo({ x: to * W, animated: true });
    };

    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const next = Math.round(e.nativeEvent.contentOffset.x / W);
        setIndex(next);
    };

    const next = () => (isLast ? onComplete() : go(index + 1));
    const back = () => !isFirst && go(index - 1);
    const skip = async () => {
        await Haptics.selectionAsync();
        onSkip ? onSkip() : onComplete();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Pages */}
            <ScrollView
                ref={ref}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumEnd}
                contentContainerStyle={{ alignItems: "stretch" }}
            >
                {steps.map((step) => (
                    <View key={step.id} style={[styles.page, { width: W }]}>
                        {/* Halo dégradé derrière l’emoji */}
                        <LinearGradient
                            colors={[
                                step.accent ?? withAlpha(theme.primary, 0.35),
                                withAlpha(theme.background, 0.0),
                            ]}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={styles.emojiHalo}
                        />
                        <View
                            style={[
                                styles.emojiWrap,
                                { backgroundColor: withAlpha(step.accent ?? theme.primary, 0.12) },
                            ]}
                        >
                            <Text style={styles.emoji} accessibilityLabel={step.title}>
                                {step.emoji}
                            </Text>
                        </View>

                        <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>
                        <Text style={[styles.desc, { color: withAlpha(theme.text, 0.8) }]}>
                            {step.description}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {/* Progress */}
            {showProgress && (
                <View style={styles.dots}>
                    {steps.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor:
                                        i === index ? theme.primary : withAlpha(theme.text, 0.25),
                                    opacity: i === index ? 1 : 0.5,
                                    width: i === index ? DOT * 2.2 : DOT,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Top-right Skip */}
            {showSkip && !isLast && (
                <Pressable style={styles.skip} onPress={skip} hitSlop={10}>
                    <Text style={{ color: withAlpha(theme.text, 0.7), fontWeight: "800" }}>
                        Passer
                    </Text>
                </Pressable>
            )}

            {/* Bottom actions */}
            <View style={styles.actions}>
                {!isFirst ? (
                    <GhostButton label={backLabel} onPress={back} />
                ) : (
                    <View style={{ flex: 1 }} />
                )}

                <GradientButton
                    label={isLast ? doneLabel : nextLabel}
                    onPress={next}
                    colors={[
                        (steps[index].accent ?? theme.primary) as string,
                        withAlpha(theme.text, 0.18),
                    ]}
                    themeBg={theme.background}
                />
            </View>
        </View>
    );
};

export default Onboarding;

/* ————— Buttons ————— */

const GradientButton: React.FC<{
    label: string;
    onPress: () => void;
    colors: [string, string];
    themeBg: string;
}> = ({ label, onPress, colors, themeBg }) => {
    return (
        <Pressable style={styles.ctaPressable} onPress={onPress}>
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
            >
                <Text style={[styles.ctaText, { color: themeBg }]}>{label}</Text>
            </LinearGradient>
        </Pressable>
    );
};

const GhostButton: React.FC<{ label: string; onPress: () => void }> = ({
    label,
    onPress,
}) => {
    return (
        <Pressable onPress={onPress} style={styles.ghost}>
            <Text style={styles.ghostText}>{label}</Text>
        </Pressable>
    );
};

/* ————— Styles ————— */

const styles = StyleSheet.create({
    container: { flex: 1 },
    page: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
    },
    emojiHalo: {
        position: "absolute",
        top: 0,
        left: W / 2 - 140,
        width: 280,
        height: 280,
        borderRadius: 140,
        opacity: 0.35,
    },
    emojiWrap: {
        width: 140,
        height: 140,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    emoji: { fontSize: 72 },
    title: { fontSize: 24, fontWeight: "900", textAlign: "center" },
    desc: { fontSize: 15, fontWeight: "600", textAlign: "center", lineHeight: 22 },

    dots: {
        position: "absolute",
        bottom: 120,
        width: "100%",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    dot: {
        height: DOT,
        borderRadius: DOT,
    },

    skip: { position: "absolute", top: 20, right: 16 },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    ghost: {
        flex: 1,
        height: 48,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.25)",
        alignItems: "center",
        justifyContent: "center",
    },
    ghostText: { fontWeight: "800", fontSize: 14, opacity: 0.9, color: "#fff" },
    ctaPressable: { flex: 2, borderRadius: 999, overflow: "hidden" },
    cta: {
        height: 48,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaText: { fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },
});