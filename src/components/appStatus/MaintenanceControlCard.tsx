import React, { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Image } from "expo-image";

import { useAppTheme } from "@/src/context/ThemeProvider";
import Field from "@/src/components/common/form/Field";
import SheetTextInput from "@/src/components/common/form/SheetTextInput";

type Props = {
    maintenanceEnabled: boolean;
    maintenanceMessage: string;
    maintenanceImageUrl: string;
    lastUpdate?: string;
    loading: boolean;
    isDirty: boolean;
    saving: boolean;
    onChangeMessage: (msg: string) => void;
    onChangeImageUrl: (url: string) => void;
    onSave: () => void;
    onDisable: () => void;
};

const PREVIEW_SIZE = 72;

const MaintenanceControlCard: React.FC<Props> = ({
    maintenanceEnabled,
    maintenanceMessage,
    maintenanceImageUrl,
    lastUpdate,
    loading,
    isDirty,
    saving,
    onChangeMessage,
    onChangeImageUrl,
    onSave,
    onDisable,
}) => {
    const theme = useAppTheme();

    const trimmedMessage = useMemo(
        () => (maintenanceMessage ?? "").trim(),
        [maintenanceMessage],
    );
    const trimmedImageUrl = useMemo(
        () => (maintenanceImageUrl ?? "").trim(),
        [maintenanceImageUrl],
    );

    const imageUrlLooksValid = useMemo(() => {
        if (!trimmedImageUrl) return true;
        return /^https?:\/\/.+/i.test(trimmedImageUrl);
    }, [trimmedImageUrl]);

    const imageUrlError = !imageUrlLooksValid
        ? "URL invalide (doit commencer par http:// ou https://)."
        : undefined;

    const mainButtonLabel = maintenanceEnabled
        ? "Mettre à jour"
        : "Activer la maintenance";

    const disableButtonLabel = "Désactiver la maintenance";

    const canSubmit =
        !!trimmedMessage &&
        imageUrlLooksValid &&
        !saving &&
        (maintenanceEnabled ? isDirty : true);

    const showMiniLoader = loading && !saving;

    const handleConfirmSave = () => {
        const title = maintenanceEnabled
            ? "Mettre à jour la maintenance ?"
            : "Activer la maintenance ?";
        const description = maintenanceEnabled
            ? "Le message sera mis à jour pour tous les utilisateurs."
            : "L’application sera bloquée pour tous les utilisateurs.";

        Alert.alert(title, description, [
            { text: "Annuler", style: "cancel" },
            {
                text: maintenanceEnabled ? "Mettre à jour" : "Activer",
                style: "destructive",
                onPress: onSave,
            },
        ]);
    };

    const handleConfirmDisable = () => {
        Alert.alert(
            "Désactiver la maintenance ?",
            "L’application redeviendra accessible pour tous les utilisateurs.",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Désactiver",
                    style: "destructive",
                    onPress: onDisable,
                },
            ],
        );
    };

    return (
        <View
            style={[
                styles.card,
            {
                backgroundColor: theme.surface,
                borderColor: maintenanceEnabled ? theme.warning : theme.border,
            },
            ]}
        >
            <View style={styles.headerBlock}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: theme.text }]}>
                        Mode maintenance
                    </Text>

                    <View
                        style={[
                            styles.statusPill,
                            {
                                backgroundColor: maintenanceEnabled
                                    ? theme.warning
                                    : theme.borderSecondary,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusPillText,
                                {
                                    color: maintenanceEnabled
                                        ? theme.background
                                        : theme.text,
                                },
                            ]}
                        >
                            {maintenanceEnabled ? "Activé" : "Désactivé"}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.subtitle, { color: theme.textInactive }]}>
                    Bloque l’app pour tous les utilisateurs, sauf comptes autorisés.
                </Text>
            </View>

            <Field
                label="Message affiché aux utilisateurs"
                error={undefined}
                touched={!!trimmedMessage}
            >
                <SheetTextInput
                    value={maintenanceMessage}
                    onChangeText={onChangeMessage}
                    placeholder="Exemple : Nous effectuons une maintenance, l'app reviendra très vite 🚧"
                    enableSuggestions
                    multiline
                    style={{ minHeight: 80, textAlignVertical: "top" }}
                />
            </Field>

            <Field
                label="Image / GIF (URL)"
                error={imageUrlError}
                touched={!!trimmedImageUrl || !!imageUrlError}
            >
                <View style={styles.imageRow}>
                    <SheetTextInput
                        value={maintenanceImageUrl}
                        onChangeText={onChangeImageUrl}
                        placeholder="https://..."
                        keyboardType="url"
                        style={
                            imageUrlError
                                ? { borderColor: theme.error }
                                : undefined
                        }
                        containerStyle={{ flex: 1 }}
                    />

                    <View
                        style={[
                            styles.previewBox,
                            {
                                backgroundColor: theme.backgroundSecondary,
                                borderColor: imageUrlError
                                    ? theme.error
                                    : theme.borderSecondary,
                            },
                        ]}
                    >
                        {trimmedImageUrl && imageUrlLooksValid ? (
                            <Image
                                source={{ uri: trimmedImageUrl }}
                                style={styles.previewImage}
                                contentFit="cover"
                            />
                        ) : (
                            <Text
                                style={[
                                    styles.previewPlaceholder,
                                    { color: theme.textInactive },
                                ]}
                            >
                                Aperçu
                            </Text>
                        )}
                    </View>
                </View>
            </Field>

            <View style={styles.buttonsRow}>
                <TouchableOpacity
                    onPress={handleConfirmSave}
                    disabled={!canSubmit}
                    style={[
                        styles.primaryButton,
                        {
                            backgroundColor: canSubmit
                                ? theme.warning
                                : theme.borderSecondary,
                            opacity: canSubmit ? 1 : 0.6,
                        },
                    ]}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={theme.background} />
                    ) : (
                        <Text
                            style={[
                                styles.primaryButtonText,
                                { color: theme.background },
                            ]}
                        >
                            {mainButtonLabel}
                        </Text>
                    )}
                </TouchableOpacity>

                {maintenanceEnabled && (
                    <TouchableOpacity
                        onPress={handleConfirmDisable}
                        disabled={saving}
                        style={[
                            styles.secondaryButton,
                            {
                                borderColor: theme.borderSecondary,
                                backgroundColor: theme.backgroundSecondary,
                                opacity: saving ? 0.6 : 1,
                            },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Text
                            style={[
                                styles.secondaryButtonText,
                                { color: theme.text },
                            ]}
                        >
                            {disableButtonLabel}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.footerRow}>
                {lastUpdate && (
                    <Text
                        style={[styles.lastUpdate, { color: theme.textInactive }]}
                        numberOfLines={1}
                    >
                        Dernière mise à jour :{" "}
                        {new Date(lastUpdate).toLocaleString()}
                    </Text>
                )}

                {showMiniLoader && (
                    <View style={styles.miniLoaderRow}>
                        <ActivityIndicator size="small" color={theme.textInactive} />
                        <Text
                            style={[
                                styles.miniLoaderText,
                                { color: theme.textInactive },
                            ]}
                        >
                            Synchronisation…
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default MaintenanceControlCard;

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 16,
        borderWidth: 1.5,
        gap: 12,
    },
    headerBlock: {
        gap: 8,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
    },
    subtitle: {
        fontSize: 12,
        fontWeight: "500",
    },
    statusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    imageRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    previewBox: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 12,
        borderWidth: 1.5,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    previewImage: {
        width: "100%",
        height: "100%",
    },
    previewPlaceholder: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    buttonsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 6,
    },
    primaryButton: {
        flex: 1,
        borderRadius: 999,
        minHeight: 40,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    primaryButtonText: {
        fontSize: 13,
        fontWeight: "700",
    },
    secondaryButton: {
        borderRadius: 999,
        minHeight: 40,
        paddingHorizontal: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    secondaryButtonText: {
        fontSize: 12,
        fontWeight: "700",
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 2,
    },
    lastUpdate: {
        fontSize: 11,
        fontWeight: "500",
        flexShrink: 1,
    },
    miniLoaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    miniLoaderText: {
        fontSize: 11,
        fontWeight: "500",
    },
});