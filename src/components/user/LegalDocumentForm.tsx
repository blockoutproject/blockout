import React, { useMemo, useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { BottomSheetTextInput, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/src/context/ThemeProvider";
import type { LegalDocument } from "@/src/types/LegalDocument";
import ConfigApi from "@/src/api/ConfigApi";
import Field from "@/src/components/common/form/Field";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";

export type LegalDocumentFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type LegalDocumentFormProps = {
    document: LegalDocument;
    onSuccess: () => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: LegalDocumentFormExternalState) => void;
};

const LegalDocumentForm: React.FC<LegalDocumentFormProps> = ({
    document,
    onSuccess,
    onRegisterSubmit,
    onStateChange,
}) => {
    const theme = useAppTheme();
    const api = ConfigApi.getInstance();

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
            } catch {
                setApiError("Erreur lors de la sauvegarde.");
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

    return (
        <>
            <BottomSheetScrollView
                contentContainerStyle={styles.content}
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

            <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
        </>
    );
};

export default LegalDocumentForm;

const styles = StyleSheet.create({
    content: {
        padding: 8,
        gap: 12,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    textarea: {
        maxHeight: 300,
        textAlignVertical: "top",
        minHeight: 180,
    },
});