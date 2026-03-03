import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSession } from "@/src/context/SessionProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import InfoPillGradient from "@/src/components/common/chips/InfoPillGradient";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import { GradientButton } from "@/src/components/common/GradientButton";
import { ApiError } from "../api/core/ApiError";
import { APP_TITLE } from "../theme/globals";

export const getLiveLinkErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
        if (err.status === 0 || err.status >= 500) {
            return "Le serveur rencontre un problème, réessaie dans quelques instants.";
        }
        if (err.message && err.message.trim().length > 0) {
            return err.message;
        }
        return "Erreur lors de la connexion.";
    }
    return "Connection impossible, réessaie.";
};

const LoginScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { signIn, continueAsGuest, isLoading, error } = useSession();

    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isGuesting, setIsGuesting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        console.log(error);
        if (!isSigningIn && error && !(["NO_CREDENTIALS", "USER_CANCELLED"].includes(error?.name))) {
            const msg = getLiveLinkErrorMessage(error);
            setApiError(msg);
        }
    }, [error, isSigningIn]);

    const onPressLogin = async () => {
        try {
            setIsSigningIn(true);
            setApiError(null);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await signIn();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSigningIn(false);
        }
    };

    const onPressGuest = async () => {
        try {
            setIsGuesting(true);
            setApiError(null);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            continueAsGuest();
        } catch (err) {
            console.error(err);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setApiError("Impossible de continuer en invité.");
        } finally {
            setIsGuesting(false);
        }
    };

    const disabled = isSigningIn || isLoading;

    return (
        <View style={styles.content}>
            <View style={styles.brandRow}>
                <MaskedImage
                    fallback={require("@/assets/images/blockout-logo-dark.png")}
                    size={36}
                    radius={10}
                    shadow
                />
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {APP_TITLE}
                </Text>
            </View>

            <Text style={[styles.tagline, { color: withAlpha(theme.text, 0.8) }]}>
                Ton appli pour suivre le volley : scores en direct, classements et équipes.
            </Text>

            <View style={styles.pillsRow}>
                <InfoPillGradient
                    label="Scores"
                    leftIcon="flash"
                    size="md"
                    variant="filled"
                    gradient={undefined}
                    borderWidth={1}
                    backgroundColor={theme.surface}
                    borderColor={withAlpha(theme.text, 0.12)}
                    textColor={theme.text}
                />
                <InfoPillGradient
                    label="Classements"
                    leftIcon="trophy"
                    size="md"
                    variant="filled"
                    gradient={undefined}
                    borderWidth={1}
                    backgroundColor={theme.surface}
                    borderColor={withAlpha(theme.text, 0.12)}
                    textColor={theme.text}
                />
                <InfoPillGradient
                    label="Suivi équipes"
                    leftIcon="bell-outline"
                    size="md"
                    variant="filled"
                    gradient={undefined}
                    borderWidth={1}
                    backgroundColor={theme.surface}
                    borderColor={withAlpha(theme.text, 0.12)}
                    textColor={theme.text}
                />
            </View>

            <View style={styles.ctaRow}>
                <GradientButton
                    onPress={onPressLogin}
                    loading={isSigningIn || isLoading}
                    disabled={disabled}
                    label="Se connecter"
                    loadingLabel="Connexion…"
                    leftIcon={<MaterialCommunityIcons name="account" size={18} color={"#000"} />}
                    style={styles.ctaButton}
                    textColor="#000"
                />

                <TouchableOpacity
                    onPress={onPressGuest}
                    style={styles.guestButton}
                    disabled={isGuesting || disabled}
                    activeOpacity={0.8}
                >
                    {isGuesting ? (
                        <ActivityIndicator />
                    ) : (
                        <Text style={[styles.guestText, { color: withAlpha(theme.text, 0.8) }]}>
                            Continuer en tant qu’invité
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

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
    ctaRow: {
        alignItems: "center",
        gap: 12,
    },
    ctaButton: {
        width: "80%",
    },
    guestButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    guestText: {
        fontSize: 14,
        fontWeight: "700",
        textDecorationLine: "underline",
    },
    legal: {
        textAlign: "center",
        fontSize: 12,
        marginTop: 6,
    },
});