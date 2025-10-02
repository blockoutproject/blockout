import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import type { Club } from "@/src/types/Club";
import ClubsApi from "@/src/api/ClubsApi";
import { CORNERS } from "@/src/theme/globals";
import Field from "@/src/components/common/form/Field";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";

export type ClubFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type ClubFormProps = {
    club: Club;
    onSuccess: (updated?: Club) => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: ClubFormExternalState) => void;
};

const ClubForm: React.FC<ClubFormProps> = ({ club, onSuccess, onRegisterSubmit, onStateChange }) => {
    const theme = useAppTheme();
    const api = ClubsApi.getInstance();

    const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
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
            const manipContext = ImageManipulator.ImageManipulator.manipulate(selected.uri);
            manipContext.resize({ width: 512 });
            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({ format: ImageManipulator.SaveFormat.PNG, compress: 1 });
            setPreviewUri(saved.uri);
            setImageFile({ uri: saved.uri, name: "club.png", type: "image/png" });
        } catch {
            Alert.alert("Erreur", "Impossible de traiter l’image.");
        }
    };

    const formik = useFormik({
        initialValues: { name: club.name ?? "" },
        validationSchema: Yup.object({ name: Yup.string().trim().required("Nom requis") }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);
                const dto = { name: values.name.trim() };
                const updated = await api.updateClub(club.id, dto, imageFile ?? undefined);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess(updated);
            } catch {
                setApiError("Sauvegarde impossible, réessaie.");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

    const logoUri = previewUri ?? club.logoUrl ?? null;

    return (
        <>
            <BottomSheetScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Logo</Text>
                    <TouchableOpacity onPress={handlePickImage} activeOpacity={0.85} style={[styles.logoWrap, { borderColor: theme.border }]}>
                        <View style={styles.logoMask}>
                            {logoUri ? (
                                <Image source={{ uri: logoUri }} style={styles.logo} contentFit="contain" />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.textInactive} />
                                    <Text style={[styles.logoHint, { color: theme.textInactive }]}>Ajouter un logo</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handlePickImage} style={[styles.logoBtn, { backgroundColor: theme.backgroundSecondary }]}>
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.text} />
                        <Text style={[styles.logoBtnText, { color: theme.text }]}>Changer le logo</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Field label="Nom" error={formik.errors.name} touched={formik.touched.name}>
                        <BottomSheetTextInput
                            style={[
                                styles.input,
                                { borderColor: theme.border, color: theme.text },
                                formik.touched.name && formik.errors.name ? { borderColor: theme.error } : null,
                            ]}
                            value={formik.values.name}
                            onChangeText={formik.handleChange("name")}
                            onBlur={formik.handleBlur("name")}
                            placeholder="Nom du club"
                            placeholderTextColor={theme.textInactive}
                            autoCapitalize="words"
                            returnKeyType="done"
                        />
                    </Field>
                </View>
            </BottomSheetScrollView>

            <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
        </>
    );
};

export default ClubForm;

const styles = StyleSheet.create({
    scroll: { gap: 12, padding: 8 },
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
        opacity: 0.85 
    },
    logoWrap: { 
        borderWidth: 1.5, 
        borderRadius: 22, 
        alignItems: "center", 
        justifyContent: "center", 
        overflow: "hidden" 
    },
    logoMask: { 
        width: 100, 
        aspectRatio: 1, 
        borderRadius: 18, 
        overflow: "hidden", 
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 16
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
        borderRadius: CORNERS 
    },
    logoBtnText: { fontSize: 12, fontWeight: "700" },
    input: { 
        borderWidth: 1.5, 
        borderRadius: 16, 
        paddingVertical: 12, 
        paddingHorizontal: 14, 
        fontSize: 14 
    },
});