import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { useAppTheme } from "@/src/context/ThemeProvider";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import { withAlpha } from "@/src/utils/utils";
import { useSession } from "@/src/context/SessionProvider";

export default function MaintenancePage() {
    const {
        appStatus,
        isAppStatusLoading,
        refetchAppStatus,
        canBypassMaintenance,
        bypassMaintenance,
    } = useSession();

    const { message, imageUrl } = appStatus ?? { message: null, imageUrl: null };
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const hasImage = !!imageUrl;

    const handleRetry = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        refetchAppStatus();
    };

    const handleBypass = async () => {
        await Haptics.selectionAsync().catch(() => { });
        bypassMaintenance();
    };

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 24,
                    backgroundColor: theme.background,
                },
            ]}
        >
            <View style={styles.headerRow}>
                <View style={styles.brandRow}>
                    <MaskedImage
                        fallback={require("@/assets/images/blockout-logo-dark.png")}
                        size={32}
                        radius={10}
                        shadow
                    />
                    <Text style={[styles.appTitle, { color: theme.text }]}>Blockout</Text>
                </View>
            </View>

            <View style={styles.centerBlock}>
                {hasImage && (
                    <View
                        style={[
                            styles.gifWrapper,
                            {
                                backgroundColor: withAlpha(theme.surface, 0.9),
                                borderColor: withAlpha(theme.border, 0.9),
                            },
                        ]}
                    >
                        <Image
                            source={{ uri: imageUrl! }}
                            style={styles.gif}
                            contentFit="cover"
                        />
                    </View>
                )}

                <Text style={[styles.mainText, { color: theme.text }]}>
                    Maintenance en cours ⏳
                </Text>

                <Text
                    style={[
                        styles.subText,
                        { color: withAlpha(theme.text, 0.8) },
                    ]}
                >
                    {message ??
                        "On prépare une nouvelle version de l’application. Quelques minutes et tout sera de retour."}
                </Text>

                {isAppStatusLoading ? (
                    <ActivityIndicator style={{ marginTop: 18 }} color={theme.text} />
                ) : (
                    <>
                        <TouchableOpacity
                            onPress={handleRetry}
                            style={[
                                styles.retryBtn,
                                {
                                    borderColor: theme.border,
                                    backgroundColor: theme.surface,
                                },
                            ]}
                            activeOpacity={0.85}
                        >
                            <MaterialCommunityIcons name="reload" size={18} color={theme.text} />
                            <Text style={[styles.retryText, { color: theme.text }]}>Réessayer</Text>
                        </TouchableOpacity>

                        {canBypassMaintenance && (
                            <TouchableOpacity
                                onPress={handleBypass}
                                style={[
                                    styles.bypassBtn,
                                    {
                                        borderColor: withAlpha(theme.text, 0.18),
                                        backgroundColor: "transparent",
                                    },
                                ]}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.bypassText, { color: withAlpha(theme.text, 0.75) }]}>
                                    Accéder à l’application
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>

            <Text style={[styles.footer, { color: withAlpha(theme.text, 0.6) }]}>
                Merci pour ta patience !
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    headerRow: {
        width: "100%",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    appTitle: {
        fontSize: 24,
        fontWeight: "900",
        letterSpacing: 0.4,
    },
    centerBlock: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 14,
    },
    gifWrapper: {
        width: 220,
        height: 220,
        borderRadius: 24,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
        overflow: "hidden",
    },
    gif: {
        width: "100%",
        height: "100%",
    },
    mainText: {
        fontSize: 20,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 4,
    },
    subText: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
        marginTop: 2,
        paddingHorizontal: 6,
    },
    retryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        marginTop: 14,
    },
    retryText: {
        fontSize: 14,
        fontWeight: "700",
    },
    bypassBtn: {
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    bypassText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.2,
        textTransform: "uppercase",
    },
    footer: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 8,
    },
});