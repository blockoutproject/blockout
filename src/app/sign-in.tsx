import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSession } from "@/src/context/SessionProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import InfoPill from "@/src/components/common/chips/InfoPill";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import { GradientButton } from "@/src/components/common/GradientButton";
import { useOnboardingStore } from "../utils/onboardingStore";
import { useAuth0 } from "react-native-auth0";

const APP_TITLE = "Blockout";

const LoginScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { signIn, isLoading, error } = useSession();
    const { resetOnboarding } = useOnboardingStore();

    const [isSigningIn, setIsSigningIn] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        console.log("--------", error);
        if (!isSigningIn && error) {
            setApiError("Erreur lors de la connexion.");
        }
    }, [error, isSigningIn]);

    const onPressLogin = async () => {
        try {
            resetOnboarding();
            setIsSigningIn(true);
            setApiError(null);
            console.log("Revoking refresh token...");
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signIn();
        } catch (err) {
            console.error(err);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setApiError("Erreur lors de la connexion.");
        } finally {
            setIsSigningIn(false);
        }
    };

    const disabled = isSigningIn || isLoading;

    return (
        <View
            style={styles.content}
        >
            <View
                style={styles.brandRow}
            >
                <MaskedImage
                    fallback={require("@/assets/images/blockout-logo-dark.png")}
                    size={36}
                    radius={10}
                    shadow
                />
                <Text
                    style={[
                        styles.title,
                        {
                            color: theme.text,
                        },
                    ]}
                    numberOfLines={1}
                >
                    {APP_TITLE}
                </Text>
            </View>

            <Text
                style={[
                    styles.tagline,
                    {
                        color: withAlpha(theme.text, 0.8),
                    },
                ]}
            >
                Ton appli pour suivre le volley : scores en direct, classements et équipes.
            </Text>

            <View
                style={styles.pillsRow}
            >
                <InfoPill
                    leftIconName="flash"
                    label="Scores"
                />
                <InfoPill
                    leftIconName="trophy"
                    label="Classements"
                />
                <InfoPill
                    leftIconName="bell-outline"
                    label="Suivi équipes"
                />
            </View>

            <View
                style={styles.ctaRow}
            >
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
            </View>

            <Text
                style={[
                    styles.legal,
                    {
                        color: withAlpha(theme.text, 0.6),
                    },
                ]}
            >
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
    },
    ctaButton: {
        width: "80%",
    },
    legal: {
        textAlign: "center",
        fontSize: 12,
        marginTop: 6,
    },
});