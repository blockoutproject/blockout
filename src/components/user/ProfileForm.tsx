import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { BottomSheetTextInput, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import UsersApi from "@/src/api/UsersApi";
import { ApiError } from "@/src/api/AbstractApi";
import { CORNERS } from "@/src/theme/globals";
import Field from "@/src/components/common/form/Field";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import { CustomUser } from "@/src/types/User";

export type ProfileFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type UserFormProps = {
    user: CustomUser;
    onSuccess: (updated: CustomUser) => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: ProfileFormExternalState) => void;
};

const ProfileForm: React.FC<UserFormProps> = ({ user, onSuccess, onRegisterSubmit, onStateChange }) => {
    const theme = useAppTheme();
    const api = UsersApi.getInstance();

    const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const handlePickImage = async () => {
        try {
            await Haptics.selectionAsync();
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"] as unknown as ImagePicker.MediaTypeOptions,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (pickerResult.canceled) return;
            const asset = pickerResult.assets[0];
            if (!asset?.uri) return;
            const manipContext = ImageManipulator.ImageManipulator.manipulate(asset.uri);
            manipContext.resize({ width: 512 });
            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.PNG,
                compress: 1,
            });
            setPreviewUri(saved.uri);
            setImageFile({ uri: saved.uri, name: "avatar.png", type: "image/png" });
        } catch {
            Alert.alert("Erreur", "Impossible de traiter l’image.");
        }
    };

    const formik = useFormik({
        initialValues: { pseudo: user.pseudo ?? "" },
        validationSchema: Yup.object({
            pseudo: Yup.string()
                .required("Je s'appelle Groot 🌳")
                .min(3, "Min. 3 caractères")
                .max(32, "Max. 32 caractères")
                .matches(/^[a-zA-Z0-9._-]+$/, "Lettres, chiffres, ., -, _ uniquement"),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);
                const dto: Record<string, unknown> = {};
                const trimmed = values.pseudo.trim();
                if (trimmed && trimmed !== user.pseudo) dto.pseudo = trimmed;
                const updated = await api.updateUser(user.auth0Id, dto, imageFile ?? undefined);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess(updated);
            } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                    const serverMsg = (err.data && ((err.data as any).message || (err.data as any).error)) || "Ce pseudo est déjà utilisé.";
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

    useEffect(() => {
        onRegisterSubmit(formik.submitForm);
    }, [formik.submitForm, onRegisterSubmit]);

    const canSubmit = useMemo(() => formik.isValid && !loading, [formik.isValid, loading]);

    useEffect(() => {
        onStateChange?.({ loading, canSubmit });
    }, [loading, canSubmit, onStateChange]);

    const avatarUri = previewUri ?? user.pictureUrl ?? null;

    return (
        <>
            <BottomSheetScrollView
                contentContainerStyle={styles.fieldContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Photo de profil</Text>
                    <TouchableOpacity onPress={handlePickImage} activeOpacity={0.85} style={[styles.logoWrap, { borderColor: theme.border }]}>
                        <View style={styles.logoMask}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.logo} contentFit="cover" />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.textInactive} />
                                    <Text style={[styles.logoHint, { color: theme.textInactive }]}>Ajouter une photo</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickImage} style={[styles.logoBtn, { backgroundColor: theme.backgroundSecondary }]}>
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.text} />
                        <Text style={[styles.logoBtnText, { color: theme.text }]}>Changer la photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Field label="Pseudo" error={formik.errors.pseudo} touched={formik.touched.pseudo}>
                        <BottomSheetTextInput
                            style={[
                                styles.input,
                                { borderColor: theme.border, color: theme.text },
                                formik.touched.pseudo && formik.errors.pseudo ? { borderColor: theme.error } : null,
                            ]}
                            value={formik.values.pseudo}
                            onChangeText={formik.handleChange("pseudo")}
                            onBlur={formik.handleBlur("pseudo")}
                            placeholder="Ton pseudo"
                            placeholderTextColor={theme.textInactive}
                            autoCapitalize="none"
                            returnKeyType="done"
                        />
                    </Field>
                </View>
            </BottomSheetScrollView>

            <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
        </>
    );
};

export default ProfileForm;

const styles = StyleSheet.create({
    fieldContainer: {
        padding: 8,
        gap: 12,
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
    logo: {
        width: "100%",
        height: "100%",
    },
    logoPlaceholder: {
        alignItems: "center",
        gap: 6,
    },
    logoHint: {
        fontSize: 12,
        fontWeight: "600",
    },
    logoBtn: {
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: CORNERS,
    },
    logoBtnText: {
        fontSize: 12,
        fontWeight: "700",
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
});