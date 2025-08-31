import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSession } from "@/src/context/SessionProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import InfoPill from "../components/common/chips/InfoPill";
import ApiErrorToast from "../components/common/feedback/ApiErrorToast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO = {
    title: "Blockout",
    bg: { uri: "https://blockout-assets.s3.eu-west-3.amazonaws.com/blockout-logo-dark.png" },
};

const LoginScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { signIn, isLoading, error } = useSession();

    const [isSigningIn, setIsSigningIn] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (!isSigningIn && error) {
            setApiError("Erreur lors de la connexion.");
        }
    }, [error, isSigningIn]);

    const onPressLogin = async () => {
        try {
            setIsSigningIn(true);
            setApiError(null);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signIn();
        } catch (err) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setApiError("Erreur lors de la connexion.");
            console.error(err);
        } finally {
            setIsSigningIn(false);
        }
    };
    const ctaGradient: [string, string, string] = ["#6EE7F9", "#A78BFA", "#F472B6"];
    const disabled = isSigningIn || isLoading;

    return (
        <View style={styles.content}>
            {/* branding */}
            <View style={styles.brandRow}>
                <MaskedImage fallback={require("@/assets/images/blockout-logo-dark.png")} size={36} radius={10} shadow />
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{HERO.title}</Text>
            </View>

            <Text style={[styles.tagline, { color: withAlpha(theme.text, 0.8) }]}>
                Ton appli pour suivre le volley : scores en direct, classements et équipes.
            </Text>

            {/* micro-features */}
            <View style={styles.pillsRow}>
                <InfoPill leftIconName="flash" label="Live scores" />
                <InfoPill leftIconName="trophy" label="Classements" />
                <InfoPill leftIconName="bell-outline" label="Suivi équipes" />
            </View>

            {/* CTA avec SPINNER dans le bouton */}
            <Pressable onPress={onPressLogin} style={styles.ctaPressable} disabled={disabled}>
                <LinearGradient
                    colors={ctaGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.ctaButton, isSigningIn && { opacity: 0.75 }]}
                >
                    {(isSigningIn || isLoading) ? (
                        <>
                            <ActivityIndicator size="small" color={theme.background} />
                            <Text style={[styles.ctaText, { color: theme.background }]}>Connexion…</Text>
                        </>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="account" size={18} color={theme.background} />
                            <Text style={[styles.ctaText, { color: theme.background }]}>Se connecter</Text>
                        </>
                    )}
                </LinearGradient>
            </Pressable>

            <Text style={[styles.legal, { color: withAlpha(theme.text, 0.6) }]}>
                En continuant, tu acceptes nos CGU et notre politique de confidentialité.
            </Text>

            <ApiErrorToast
                message={apiError}
                bottomOffset={insets.bottom}
                onHidden={() => setApiError(null)}
            />
        </View>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 28,
        justifyContent: "center",
        gap: 18,
    },

    brandRow: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    title: {
        fontSize: 40,
        fontWeight: "900",
        letterSpacing: 0.4,
    },
    tagline: {
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
        fontWeight: "600",
    },

    pillsRow: {
        flexDirection: "row",
        alignSelf: "center",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "center",
        maxWidth: "100%",
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    pillText: { fontSize: 12, fontWeight: "800" },

    ctaPressable: {
        alignSelf: "center",
        width: "80%",
        borderRadius: 999,
        overflow: "hidden",
    },
    ctaButton: {
        height: 54,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
    },
    ctaText: { fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },

    legal: { textAlign: "center", fontSize: 12, marginTop: 6 },
});