// src/app/sign-in/index.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ImageBackground, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSession } from "@/src/context/SessionProvider";
import { useUserContext } from "@/src/context/UserProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "@/src/components/common/MaskedImage";

const HERO = {
    title: "Blockout",
    bg: { uri: "https://blockout-assets.s3.eu-west-3.amazonaws.com/blockout-logo-dark.png" },
};

const LoginScreen: React.FC = () => {
    const theme = useAppTheme();
    const { signIn, authenticated, isLoading: authLoading } = useSession();
    const { userReady, isLoading: userLoading } = useUserContext();

    const [isSigningIn, setIsSigningIn] = useState(false);
    // bouton en “busy” si on clique OU si l’auth/user charge encore
    const busy = isSigningIn || authLoading || (authenticated && (!userReady || userLoading));

    const onPressLogin = async () => {
        try {
            setIsSigningIn(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signIn();
        } finally {
            setIsSigningIn(false);
        }
    };

    const ctaGradient: [string, string, string] = ["#6EE7F9", "#A78BFA", "#F472B6"];

    return (
        <ImageBackground source={HERO.bg} style={styles.background} resizeMode="cover">
            {/* voiles lisibilité */}
            <LinearGradient
                colors={[withAlpha(theme.backgroundSecondary, 0.95), withAlpha(theme.backgroundSecondary, 0.35)]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />
            <LinearGradient
                colors={[withAlpha(theme.backgroundSecondary, 0.85), withAlpha(theme.backgroundSecondary, 0.0), withAlpha(theme.backgroundSecondary, 0.85)]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

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
                    <Pill icon="flash" label="Live scores" themeText={theme.text} themeBG={theme.background} />
                    <Pill icon="trophy" label="Classements" themeText={theme.text} themeBG={theme.background} />
                    <Pill icon="bell-outline" label="Suivi équipes" themeText={theme.text} themeBG={theme.background} />
                </View>

                {/* CTA avec SPINNER dans le bouton */}
                <Pressable onPress={onPressLogin} style={styles.ctaPressable} disabled={busy}>
                    <LinearGradient
                        colors={ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.ctaButton, busy && { opacity: 0.75 }]}
                    >
                        {busy ? (
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
            </View>
        </ImageBackground>
    );
};

export default LoginScreen;

const Pill: React.FC<{
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    label: string;
    themeText: string;
    themeBG: string;
}> = ({ icon, label, themeText, themeBG }) => (
    <View
        style={[
            styles.pill,
            {
                borderColor: withAlpha(themeText, 0.2),
                backgroundColor: withAlpha(themeBG, 0.5),
            },
        ]}
    >
        <MaterialCommunityIcons name={icon} size={14} color={themeText} />
        <Text style={[styles.pillText, { color: themeText }]} numberOfLines={1}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    background: { flex: 1 },
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