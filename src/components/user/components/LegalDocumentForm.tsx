import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/context/ThemeProvider';
import type { LegalDocument } from '@/src/types/LegalDocument';
import ConfigApi from '@/src/api/ConfigApi';
import { CORNERS } from '@/src/theme/globals';

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
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess();
            } catch (err) {
                console.error(err);
                setApiError('Erreur lors de la sauvegarde.');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <View style={{ flex: 1 }}>
            <BottomSheetScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 88 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Field label="Titre" error={formik.errors.title} touched={formik.touched.title}>
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.title}
                        onChangeText={formik.handleChange('title')}
                        onBlur={formik.handleBlur('title')}
                        placeholder="Titre"
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>

                <Field label="Version" error={formik.errors.version} touched={formik.touched.version}>
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.version}
                        onChangeText={formik.handleChange('version')}
                        onBlur={formik.handleBlur('version')}
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
                        onBlur={formik.handleBlur('content')}
                        placeholder="Contenu du document légal..."
                        placeholderTextColor={theme.textInactive}
                    />
                </Field>
            </BottomSheetScrollView>

            {apiError ? (
                <Animated.View
                    style={[
                        styles.apiErrorContainer,
                        {
                            backgroundColor: theme.error + '22',
                            borderColor: theme.error,
                            bottom: insets.bottom + 64,
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

            <View
                style={[
                    styles.footer,
                    {
                        paddingBottom: insets.bottom + 8,
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
    );
};

const Field: React.FC<{ label: string; children: React.ReactNode; error?: string; touched?: boolean }> = ({
    label,
    children,
    error,
    touched,
}) => {
    const theme = useAppTheme();
    return (
        <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            {children}
            {touched && error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    content: { padding: 8, gap: 12 },
    fieldBlock: { marginBottom: 6 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
    input: { borderWidth: 1.5, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
    textarea: { maxHeight: 420, textAlignVertical: 'top', minHeight: 180 },
    apiErrorContainer: {
        position: 'absolute',
        left: 12,
        right: 12,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        gap: 8,
        zIndex: 20,
    },
    apiErrorText: { flex: 1, fontSize: 14, fontWeight: '600' },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    submitBtn: {
        borderRadius: CORNERS,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    submitText: { fontWeight: '800', fontSize: 16 },
    error: { fontSize: 12, marginTop: 4, marginLeft: 8, fontWeight: '600' },
});

export default LegalDocumentForm;