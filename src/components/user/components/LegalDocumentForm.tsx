import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/src/context/ThemeProvider';
import type { LegalDocument } from '@/src/types/LegalDocument';
import ConfigApi from '@/src/api/ConfigApi';

interface LegalDocumentFormProps {
    document: LegalDocument;
    onSuccess: () => void;
}

const LegalDocumentForm: React.FC<LegalDocumentFormProps> = ({ document, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
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
            title: Yup.string().required('Titre requis'),
            version: Yup.string().required('Version requise'),
            content: Yup.string().required('Contenu requis'),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);

                await api.updateLegalDocument(document.type, values);
                onSuccess();
            } catch (err) {
                console.error(err);
                setApiError('Erreur lors de la sauvegarde.');
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <BottomSheetView style={[styles.container, { paddingBottom: insets.bottom }]}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
            >
                <Field label="Titre" error={formik.errors.title} touched={formik.touched.title}>
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.title}
                        onChangeText={formik.handleChange('title')}
                        placeholder="Titre"
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>

                <Field label="Version" error={formik.errors.version} touched={formik.touched.version}>
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.version}
                        onChangeText={formik.handleChange('version')}
                        placeholder="2025-08-08"
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>

                <Field label="Contenu (Markdown)" error={formik.errors.content} touched={formik.touched.content}>
                    <BottomSheetTextInput
                        multiline
                        scrollEnabled
                        style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.content}
                        onChangeText={formik.handleChange('content')}
                        placeholder="Contenu du document légal..."
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>

                {apiError && <Text style={styles.error}>{apiError}</Text>}
            </ScrollView>

            <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
                disabled={loading}
                onPress={() => formik.handleSubmit()}
            >
                {loading ? (
                    <ActivityIndicator color={theme.text} />
                ) : (
                    <Text style={[styles.buttonText, { color: theme.text }]}>Enregistrer</Text>
                )}
            </TouchableOpacity>
        </BottomSheetView>
    );
};

const Field: React.FC<{ label: string; children: React.ReactNode; error?: string; touched?: boolean }> = ({ label, children, error, touched }) => {
    const theme = useAppTheme();
    return (
        <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            {children}
            {touched && error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    scrollContainer: {
        flex: 1,
    },
    fieldBlock: {
        marginBottom: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        fontSize: 14,
    },
    textarea: {
        maxHeight: 400,
        textAlignVertical: 'top',
    },
    button: {
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    error: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 8,
    },
});

export default LegalDocumentForm;