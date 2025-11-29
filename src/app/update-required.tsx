// FILE: app/update-required.tsx

import React, { useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSession } from "@/src/context/SessionProvider";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import AppStatusLayout from "@/src/components/appStatus/AppStatusLayout";
import { CURRENT_APP_VERSION } from "@/src/utils/appVersion";
import { CORNERS } from "@/src/theme/globals";
import { Image } from "expo-image";

const UpdateRequiredScreen: React.FC = () => {
    const {
        appStatus,
        isAppStatusLoading,
        refetchAppStatus,
        appUpdateUrl,
        canBypassUpdate,
        bypassUpdate,
    } = useSession();

    const theme = useAppTheme();

    const message = useMemo(
        () =>
            appStatus?.forceUpdateMessage ??
            "Une nouvelle version de Blockout est disponible et est obligatoire pour continuer à utiliser l’application.",
        [appStatus?.forceUpdateMessage],
    );

    const handleOpenStore = useCallback(async () => {
        if (!appUpdateUrl) return;
        try {
            await Haptics.selectionAsync().catch(() => {});
            const canOpen = await Linking.canOpenURL(appUpdateUrl);
            if (canOpen) {
                await Linking.openURL(appUpdateUrl);
            }
        } catch {}
    }, [appUpdateUrl]);

    const handleRetry = useCallback(async () => {
        await Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Medium,
        ).catch(() => {});
        refetchAppStatus();
    }, [refetchAppStatus]);

    const handleBypass = useCallback(async () => {
        if (!canBypassUpdate) return;
        await Haptics.selectionAsync().catch(() => {});
        bypassUpdate();
    }, [bypassUpdate, canBypassUpdate]);

    return (
        <AppStatusLayout footer="Merci de garder Blockout à jour !">
            <View style={styles.cardWrapper}>
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                            borderColor: theme.primary,
                        },
                    ]}
                >
                    <View style={styles.headerSection}>
                        <View
                            style={[
                                styles.pill,
                                { backgroundColor: theme.backgroundSecondary },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="alert-decagram-outline"
                                size={18}
                                color={theme.primary}
                            />
                            <Text
                                style={[
                                    styles.pillText,
                                    { color: theme.primary },
                                ]}
                            >
                                Mise à jour requise
                            </Text>
                        </View>

                        <Text
                            style={[styles.title, { color: theme.text }]}
                            numberOfLines={2}
                        >
                            Mets Blockout à jour pour continuer
                        </Text>
                    </View>

                    <View style={styles.illustrationSection}>
                        <Image
                            source={require("@/assets/images/update-required.png")}
                            style={{
                                width: 250,
                                aspectRatio: 1
                            }}
                        />
                    </View>

                    <View style={styles.messageSection}>
                        <Text
                            style={[
                                styles.messageText,
                                { color: theme.textInactive },
                            ]}
                        >
                            {message}
                        </Text>

                        <Text
                            style={[
                                styles.versionText,
                                { color: theme.textInactive },
                            ]}
                        >
                            Version installée : {CURRENT_APP_VERSION}
                        </Text>
                    </View>

                    <View style={styles.actionsSection}>
                        {isAppStatusLoading ? (
                            <ActivityIndicator color={theme.text} />
                        ) : (
                            <>
                                <TouchableOpacity
                                    onPress={handleOpenStore}
                                    disabled={!appUpdateUrl}
                                    activeOpacity={0.85}
                                    style={[
                                        styles.primaryButton,
                                        {
                                            backgroundColor: theme.primary,
                                            opacity: appUpdateUrl ? 1 : 0.6,
                                        },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="open-in-new"
                                        size={18}
                                        color={theme.text}
                                    />
                                    <Text
                                        style={[
                                            styles.primaryButtonText,
                                            { color: theme.text },
                                        ]}
                                    >
                                        Mettre à jour l’application
                                    </Text>
                                </TouchableOpacity>

                                {canBypassUpdate && (
                                    <TouchableOpacity
                                        onPress={handleBypass}
                                        activeOpacity={0.85}
                                        style={[
                                            styles.bypassButton,
                                            {
                                                borderColor:
                                                    theme.borderSecondary,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.bypassButtonText,
                                                { color: theme.textInactive },
                                            ]}
                                        >
                                            Accéder à l’application
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </View>
        </AppStatusLayout>
    );
};

export default UpdateRequiredScreen;

const styles = StyleSheet.create({
    cardWrapper: {
        width: "100%",
        maxWidth: 430,
        marginHorizontal: 6,
        alignSelf: "center",
    },
    card: {
        borderRadius: 22,
        borderWidth: 1.5,
        paddingHorizontal: 18,
        paddingVertical: 20,
        alignItems: "center",
        gap: 18,
    },
    headerSection: {
        width: "100%",
        alignItems: "flex-start",
        gap: 8,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        gap: 6,
    },
    pillText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
    },
    illustrationSection: {
        width: "100%",
        alignItems: "center",
    },
    messageSection: {
        width: "100%",
        gap: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
    },
    versionText: {
        fontSize: 12,
        textAlign: "center",
    },
    actionsSection: {
        width: "100%",
        gap: 10,
        marginTop: 4,
    },
    primaryButton: {
        borderRadius: CORNERS,
        paddingVertical: 12,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    primaryButtonText: {
        fontWeight: "800",
        fontSize: 16,
    },
    bypassButton: {
        marginTop: 4,
        borderRadius: CORNERS,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: "center",
    },
    bypassButtonText: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
});