import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import UsersApi from "@/src/api/UsersApi";
import type { CustomUser } from "@/src/types/User";
import { ApiError } from "@/src/api/AbstractApi";
import { CORNERS } from "@/src/theme/globals";
import Field from "../../common/Field";
import useKeyboardVisible from "@/src/hooks/utils/useKeyboardVisible";

type UserFormProps = { user: CustomUser; onSuccess: (updated: CustomUser) => void };

const FOOTER_HEIGHT = 60;

const UserForm: React.FC<UserFormProps> = ({ user, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = UsersApi.getInstance();
    const isKeyboardVisible = useKeyboardVisible();

    const [imageFile, setImageFile] = useState<any | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const errorOpacity = useRef(new Animated.Value(0)).current;
    const errorTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (apiError) {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
            errorOpacity.setValue(0);
            Animated.timing(errorOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
            errorTimerRef.current = setTimeout(() => {
                Animated.timing(errorOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
                    if (finished) setApiError(null);
                });
            }, 5000) as unknown as number;
        }
        return () => {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
        };
    }, [apiError, errorOpacity]);

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

            const asset = pickerResult.assets[0];
            if (!asset.uri) return;

            const manipContext = ImageManipulator.ImageManipulator.manipulate(asset.uri);
            manipContext.resize({ width: 512 });
            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.PNG,
                compress: 1,
            });

            setPreviewUri(saved.uri);
            setImageFile({ uri: saved.uri, name: "avatar.png", type: "image/png" });
        } catch (e) {
            console.error(e);
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

                const dto: Record<string, any> = {};
                const trimmed = values.pseudo.trim();
                if (trimmed && trimmed !== user.pseudo) dto.pseudo = trimmed;

                const updated = await api.updateUser(user.auth0Id, dto, imageFile ?? undefined);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess(updated);
            } catch (err: any) {
                console.error(err);
                if (err instanceof ApiError && err.status === 409) {
                    const serverMsg = (err.data && (err.data.message || err.data.error)) || "Ce pseudo est déjà utilisé.";
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

    // === Metrics ===
    const outerPaddingBottom = isKeyboardVisible ? 8 : insets.bottom + 8;
    const errorBottomOffset = FOOTER_HEIGHT + outerPaddingBottom;

    return (
        <View style={{ flex: 1, paddingBottom: outerPaddingBottom }}>
            <BottomSheetScrollView
                contentContainerStyle={[
                    styles.fieldContainer,
                    { paddingBottom: FOOTER_HEIGHT + outerPaddingBottom },
                ]}
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

            {apiError ? (
                <Animated.View
                    style={[
                        styles.apiErrorContainer,
                        {
                            backgroundColor: theme.error + "22",
                            borderColor: theme.error,
                            bottom: errorBottomOffset,
                            opacity: errorOpacity,
                            transform: [
                                {
                                    translateY: errorOpacity.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [8, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.error} />
                    <Text style={[styles.apiErrorText, { color: theme.error }]}>{apiError}</Text>
                </Animated.View>
            ) : null}

            <View>
                <View
                    style={[
                        styles.footer,
                        {
                            backgroundColor: theme.backgroundSecondary,
                            borderTopColor: theme.border,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
                        disabled={loading}
                        onPress={() => formik.handleSubmit()}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.text} />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="content-save-outline" size={18} color={theme.text} />
                                <Text style={[styles.submitText, { color: theme.text }]}>Enregistrer</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default UserForm;

const styles = StyleSheet.create({
    fieldContainer: { padding: 8, gap: 12 },
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
    sectionTitle: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", opacity: 0.85 },
    logoWrap: { borderWidth: 1.5, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    logoMask: { width: 100, aspectRatio: 1, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", marginVertical: 16 },
    logo: { width: "100%", height: "100%" },
    logoPlaceholder: { alignItems: "center", gap: 6 },
    logoHint: { fontSize: 12, fontWeight: "600" },
    logoBtn: { alignSelf: "flex-start", flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: CORNERS },
    logoBtnText: { fontSize: 12, fontWeight: "700" },
    input: { borderWidth: 1.5, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
    apiErrorContainer: {
        position: "absolute",
        left: 12,
        right: 12,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        gap: 8,
        zIndex: 20,
    },
    apiErrorText: { flex: 1, fontSize: 14, fontWeight: "600" },
    footer: {
        height: FOOTER_HEIGHT,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        justifyContent: "center",
    },
    submitBtn: {
        borderRadius: CORNERS,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    submitText: { fontWeight: "800", fontSize: 16 },
});