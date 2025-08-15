import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import UsersApi from "@/src/api/UsersApi";
import type { CustomUser } from "@/src/types/User";
import { ApiError } from "@/src/api/AbstractApi";
import { CORNERS } from "@/src/theme/globals";

type UserFormProps = {
    user: CustomUser;
    onSuccess: (updated: CustomUser) => void;
};

const UserForm: React.FC<UserFormProps> = ({ user, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = UsersApi.getInstance();

    const [imageFile, setImageFile] = useState<any | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const handlePickImage = async () => {
        try {
            await Haptics.selectionAsync();

            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (pickerResult.canceled) return;

            const selected = pickerResult.assets[0];
            if (!selected?.uri) return;

            // Aligné sur ClubForm (manipulation + export PNG 512px)
            const manipContext = (ImageManipulator as any).ImageManipulator.manipulate(selected.uri);
            manipContext.resize({ width: 512 });

            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.PNG,
                compress: 1,
            });

            const fileObj = { uri: saved.uri, name: "avatar.png", type: "image/png" };

            setPreviewUri(saved.uri);
            setImageFile(fileObj);
        } catch (e) {
            console.error(e);
            Alert.alert("Erreur", "Impossible de traiter l’image.");
        }
    };

    const formik = useFormik({
        initialValues: { pseudo: user.pseudo ?? "" },
        validationSchema: Yup.object({
            pseudo: Yup.string()
                .min(3, "Min. 3 caractères")
                .max(32, "Max. 32 caractères")
                .matches(/^[a-zA-Z0-9._-]+$/, "Lettres, chiffres, ., -, _ uniquement"),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);

                const dto: Record<string, any> = {};
                const trimmed = values.pseudo.trim();
                if (trimmed && trimmed !== user.pseudo) dto.pseudo = trimmed;

                const updated = await api.updateUser(user.auth0Id, dto, imageFile ?? undefined);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess(updated);
            } catch (err: any) {
                console.error(err);

                if (err instanceof ApiError && err.status === 409) {
                    const serverMsg =
                        (err.data && (err.data.message || err.data.error)) ||
                        "Ce pseudo est déjà utilisé.";
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    formik.setFieldError("pseudo", serverMsg);
                    setApiError(null);
                } else {
                    setApiError("Sauvegarde impossible, réessaie.");
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
            } finally {
                setLoading(false);
            }
        },
    });

    const avatarUri = previewUri ?? user.pictureUrl ?? null;

    return (
        <BottomSheetView
            style={[
                styles.container,
                { backgroundColor: theme.backgroundSecondary, paddingBottom: insets.bottom },
            ]}
        >
            <View style={styles.fieldContainer}>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Photo de profil</Text>

                    <TouchableOpacity
                        onPress={handlePickImage}
                        activeOpacity={0.85}
                        style={[styles.logoWrap, { borderColor: theme.border }]}
                    >
                        <View style={styles.logoMask}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.logo} contentFit="cover" />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <MaterialIcons name="photo-camera" size={28} color={theme.textInactive} />
                                    <Text style={[styles.logoHint, { color: theme.textInactive }]}>Ajouter une photo</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handlePickImage}
                        style={[styles.logoBtn, { backgroundColor: theme.backgroundSecondary }]}
                    >
                        <MaterialIcons name="edit" size={16} color={theme.text} />
                        <Text style={[styles.logoBtnText, { color: theme.text }]}>Changer la photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Pseudo</Text>

                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            {
                                borderColor:
                                    formik.touched.pseudo && formik.errors.pseudo ? theme.error : theme.border,
                                color: theme.text,
                            },
                        ]}
                        value={formik.values.pseudo}
                        onChangeText={formik.handleChange("pseudo")}
                        onBlur={formik.handleBlur("pseudo")}
                        placeholder="Ton pseudo"
                        placeholderTextColor={theme.textInactive}
                        autoCapitalize="none"
                        returnKeyType="done"
                    />

                    {formik.touched.pseudo && formik.errors.pseudo ? (
                        <Text style={[styles.errorText, { color: theme.error }]}>{formik.errors.pseudo}</Text>
                    ) : null}
                </View>
            </View>

            {apiError ? (
                <View
                    style={[
                        styles.apiErrorContainer,
                        { backgroundColor: theme.error + "22", borderColor: theme.error },
                    ]}
                >
                    <MaterialIcons name="error-outline" size={18} color={theme.error} />
                    <Text style={[styles.apiErrorText, { color: theme.error }]}>{apiError}</Text>
                </View>
            ) : null}

            <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
                disabled={loading}
                onPress={() => formik.handleSubmit()}
            >
                {loading ? (
                    <ActivityIndicator color={theme.text} />
                ) : (
                    <Text style={[styles.submitText, { color: theme.text }]}>Enregistrer</Text>
                )}
            </TouchableOpacity>
        </BottomSheetView>
    );
};

export default UserForm;

const styles = StyleSheet.create({
    container: {
        padding: 12,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    card: {
        borderRadius: 18,
        padding: 14,
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        textTransform: "uppercase",
        opacity: 0.85,
    },
    logoWrap: {
        borderWidth: 1.5,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    logoMask: {
        width: 100,
        aspectRatio: 1,
        borderRadius: 18,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 16,
    },
    logo: { width: "100%", height: "100%" },
    logoPlaceholder: { alignItems: "center", gap: 6 },
    logoHint: { fontSize: 12, fontWeight: "600" },

    logoBtn: {
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: CORNERS,
    },
    logoBtnText: { fontSize: 12, fontWeight: "700" },
    input: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    errorText: { fontSize: 12, marginTop: 6, marginLeft: 6, fontWeight: "600" },
    apiErrorContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 6,
        marginBottom: 12,
        gap: 8,
    },
    apiErrorText: { flex: 1, fontSize: 14, fontWeight: "600" },
    submitBtn: {
        borderRadius: CORNERS,
        paddingVertical: 14,
        alignItems: "center",
    },
    submitText: { fontWeight: "800", fontSize: 16 },
});