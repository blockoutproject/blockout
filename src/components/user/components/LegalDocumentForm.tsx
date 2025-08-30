import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { BottomSheetTextInput, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { LegalDocument } from "@/src/types/LegalDocument";
import ConfigApi from "@/src/api/ConfigApi";
import { CORNERS } from "@/src/theme/globals";
import Field from "../../common/Field";
import useKeyboardVisible from "@/src/hooks/utils/useKeyboardVisible";
import ApiErrorToast from "../../common/feedback/ApiErrorToast";

interface LegalDocumentFormProps {
    document: LegalDocument;
    onSuccess: () => void;
}

const FOOTER_HEIGHT = 60;

const LegalDocumentForm: React.FC<LegalDocumentFormProps> = ({ document, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = ConfigApi.getInstance();
    const isKeyboardVisible = useKeyboardVisible();

    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const formik = useFormik({
        initialValues: {
            title: document.title,
            version: document.version,
            content: document.content,
        },
        validationSchema: Yup.object({
            title: Yup.string().required("Titre requis"),
            version: Yup.string().required("Version requise"),
            content: Yup.string().required("Contenu requis"),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);

                await api.updateLegalDocument(document.type, values);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess();
            } catch (err) {
                console.error(err);
                setApiError("Erreur lors de la sauvegarde.");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setLoading(false);
            }
        },
    });

    // === Metrics ===
    const outerPaddingBottom = isKeyboardVisible ? 8 : insets.bottom + 8;
    const errorBottomOffset = FOOTER_HEIGHT + outerPaddingBottom;

    return (
        <View style={{ flex: 1, paddingBottom: outerPaddingBottom }}>
            <BottomSheetScrollView
                contentContainerStyle={[styles.content, { paddingBottom: FOOTER_HEIGHT + outerPaddingBottom }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Field label="Titre" error={formik.errors.title} touched={formik.touched.title}>
                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            { borderColor: theme.border, color: theme.text },
                            formik.touched.title && formik.errors.title ? { borderColor: theme.error } : null,
                        ]}
                        value={formik.values.title}
                        onChangeText={formik.handleChange("title")}
                        onBlur={formik.handleBlur("title")}
                        placeholder="Titre"
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>

                <Field label="Version" error={formik.errors.version} touched={formik.touched.version}>
                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            { borderColor: theme.border, color: theme.text },
                            formik.touched.version && formik.errors.version ? { borderColor: theme.error } : null,
                        ]}
                        value={formik.values.version}
                        onChangeText={formik.handleChange("version")}
                        onBlur={formik.handleBlur("version")}
                        placeholder="2025-08-08"
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>

                <Field label="Contenu (Markdown)" error={formik.errors.content} touched={formik.touched.content}>
                    <BottomSheetTextInput
                        multiline
                        scrollEnabled
                        style={[
                            styles.input,
                            { borderColor: theme.border, color: theme.text },
                            formik.touched.content && formik.errors.content ? { borderColor: theme.error } : null,
                            styles.textarea,
                        ]}
                        value={formik.values.content}
                        onChangeText={formik.handleChange("content")}
                        onBlur={formik.handleBlur("content")}
                        placeholder="Contenu du document légal..."
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>
            </BottomSheetScrollView>

            <ApiErrorToast
                message={apiError}
                bottomOffset={errorBottomOffset}
                onHidden={() => setApiError(null)}
            />

            {/* Footer fixe */}
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
                        activeOpacity={0.85}
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

const styles = StyleSheet.create({
    content: { padding: 8, gap: 12 },
    input: { borderWidth: 1.5, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
    textarea: { maxHeight: 300, textAlignVertical: "top", minHeight: 180 },
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

export default LegalDocumentForm;