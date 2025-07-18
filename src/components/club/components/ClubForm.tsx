import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import FastImage from 'react-native-fast-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAppTheme } from '@/src/context/ThemeProvider';
import type { Club } from '@/src/types/Club';
import ClubsApi from '@/src/api/ClubsApi';


interface ClubFormProps {
    club: Club;
    onSuccess: (updated: Club) => void;
}

const ClubForm: React.FC<ClubFormProps> = ({ club, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = ClubsApi.getInstance();

    const [imageFile, setImageFile] = React.useState<any | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const handlePickImage = async () => {
        try {
            await Haptics.selectionAsync();

            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) {
                Alert.alert('Permission refusée', 'Accès aux photos requis.');
                return;
            }

            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (pickerResult.canceled) return;

            const selected = pickerResult.assets[0];
            if (!selected.uri) return;

            const manipContext = ImageManipulator.ImageManipulator.manipulate(selected.uri);
            manipContext.resize({ width: 512 });

            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.PNG,
                compress: 1,
            });

            const fileObj = {
                uri: saved.uri,
                name: `club.png`,
                type: 'image/png',
            };

            setPreviewUri(saved.uri);
            setImageFile(fileObj);
        } catch (e) {
            console.error(e);
            Alert.alert('Erreur', 'Impossible de traiter l’image.');
        }
    };

    const formik = useFormik({
        initialValues: {
            name: club.name,
            city: club.city ?? '',
            email: club.email ?? '',
            phoneNumber: club.phoneNumber ?? '',
            website: club.website ?? '',
            active: club.active,
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Nom requis'),
            email: Yup.string().email('Email invalide').nullable(),
            website: Yup.string().url('URL invalide').nullable(),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);

                const dto = {
                    name: values.name,
                    city: values.city,
                    email: values.email,
                    phoneNumber: values.phoneNumber,
                    website: values.website,
                    active: values.active,
                };

                const updated = await api.updateClub(club.id, dto, imageFile ?? undefined);
                onSuccess(updated);
            } catch (err) {
                console.error(err);
                setApiError('Sauvegarde impossible, réessaie.');
            } finally {
                setLoading(false);
            }
        },
    });

    const logoUri = previewUri ?? club.logoUrl;

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.backgroundSecondary, paddingBottom: insets.bottom },
            ]}
        >
            <Field label="Nom" error={formik.errors.name} touched={formik.touched.name}>
                <BottomSheetTextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={formik.values.name}
                    onChangeText={formik.handleChange('name')}
                    placeholder="Nom du club"
                    placeholderTextColor={theme.textInactive}
                />
            </Field>

            {/* <Field label="Ville">
                <BottomSheetTextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={formik.values.city}
                    onChangeText={formik.handleChange('city')}
                    placeholder="Ville"
                    placeholderTextColor={theme.textInactive}
                />
            </Field>

            <Field label="Email">
                <BottomSheetTextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={formik.values.email}
                    onChangeText={formik.handleChange('email')}
                    placeholder="Email"
                    keyboardType="email-address"
                    placeholderTextColor={theme.textInactive}
                />
            </Field>

            <Field label="Téléphone">
                <BottomSheetTextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={formik.values.phoneNumber}
                    onChangeText={formik.handleChange('phoneNumber')}
                    placeholder="Téléphone"
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.textInactive}
                />
            </Field> 

            <Field label="Site web">
                <BottomSheetTextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={formik.values.website}
                    onChangeText={formik.handleChange('website')}
                    placeholder="https://..."
                    placeholderTextColor={theme.textInactive}
                />
            </Field> */}

            <Field label="Logo">
                <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
                    {logoUri ? (
                        <FastImage
                            source={{ uri: logoUri }}
                            style={[styles.logo, { borderColor: theme.border, backgroundColor: theme.text }]}
                        />
                    ) : (
                        <View
                            style={[
                                styles.logo,
                                styles.logoPlaceholder,
                                { backgroundColor: theme.surface, borderColor: theme.border },
                            ]}
                        >
                            <MaterialIcons name="photo-camera" size={32} color={theme.textInactive} />
                        </View>
                    )}
                </TouchableOpacity>
            </Field>

            {apiError && <Text style={styles.apiError}>{apiError}</Text>}

            <TouchableOpacity
                style={[
                    styles.submitBtn,
                    { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 },
                ]}
                disabled={loading}
                onPress={() => formik.handleSubmit()}
            >
                {loading ? (
                    <ActivityIndicator color={theme.text} />
                ) : (
                    <Text style={[styles.submitText, { color: theme.text }]}>Enregistrer</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const Field: React.FC<{
    label: string;
    children: React.ReactNode;
    error?: string;
    touched?: boolean;
}> = ({ label, children, error, touched }) => {
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
        padding: 12 
    },
    fieldBlock: { 
        marginBottom: 18 
    },
    label: { 
        fontSize: 14, 
        fontWeight: '600', 
        marginBottom: 6, 
        marginLeft: 4 
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    error: { 
        color: 'red', 
        fontSize: 12, 
        marginTop: 4, 
        marginLeft: 8 
    },
    logo: {
        width: 100,
        aspectRatio: 1,
        borderRadius: 20,
        borderWidth: 2,
    },
    logoPlaceholder: { 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    submitBtn: {
        borderRadius: 999,
        paddingVertical: 14,
        marginHorizontal: 12,
        alignItems: 'center',
    },
    submitText: { 
        fontWeight: '600', 
        fontSize: 16 
    },
    apiError: { 
        color: 'red', 
        textAlign: 'center', 
        marginTop: 12 
    },
});

export default ClubForm;