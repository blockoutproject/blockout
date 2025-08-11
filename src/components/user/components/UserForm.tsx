import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAppTheme } from '@/src/context/ThemeProvider';
import UsersApi from '@/src/api/UsersApi';
import type { CustomUser } from '@/src/types/User';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@/src/api/AbstractApi';
import { useUserContext } from '@/src/context/UserProvider';

type Props = {
    user: CustomUser;
    onSuccess: (updated: CustomUser) => void;
};

const UserForm: React.FC<Props> = ({ user, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = UsersApi.getInstance();

    const [imageFile, setImageFile] = React.useState<any | undefined>(undefined);
    const [previewUri, setPreviewUri] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [apiError, setApiError] = React.useState<string | null>(null);

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

            const asset = pickerResult.assets[0];
            if (!asset.uri) return;

            const manipContext = ImageManipulator.ImageManipulator.manipulate(asset.uri);
            manipContext.resize({ width: 512 });
            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.PNG,
                compress: 1,
            });

            const fileObj = {
                uri: saved.uri,
                name: 'avatar.png',
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
        initialValues: { pseudo: user.pseudo || '' },
        validationSchema: Yup.object({
            pseudo: Yup.string()
                .min(3, 'Min. 3 caractères')
                .max(32, 'Max. 32 caractères')
                .matches(/^[a-zA-Z0-9._-]+$/, 'Lettres, chiffres, ., -, _ uniquement'),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);

                const dto: Record<string, any> = {};
                const trimmed = values.pseudo.trim();
                if (trimmed && trimmed !== user.pseudo) dto.pseudo = trimmed;

                const updated = await api.updateUser(user.auth0Id, dto, imageFile);
                onSuccess(updated);
            } catch (err: any) {
                console.error(err);

                // 409: pseudo déjà pris → message inline sous le champ + haptique
                if (err instanceof ApiError && err.status === 409) {
                    const serverMsg =
                        (err.data && (err.data.message || err.data.error)) ||
                        'Ce pseudo est déjà utilisé.';
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    formik.setFieldError('pseudo', serverMsg);
                    setApiError(null);
                    return;
                }

                // Erreur générique
                setApiError('Sauvegarde impossible, réessaie.');
            } finally {
                setLoading(false);
            }
        },
    });

    const avatarUri = previewUri ?? user.pictureUrl;

    return (
        <BottomSheetView style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Field label="Pseudo" error={formik.errors.pseudo} touched={formik.touched.pseudo}>
                <BottomSheetTextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={formik.values.pseudo}
                    onChangeText={formik.handleChange('pseudo')}
                    placeholder="Ton pseudo"
                    placeholderTextColor={theme.textInactive}
                />
            </Field>

            <Field label="Photo de profil">
                <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
                    {avatarUri ? (
                        <Image
                            source={{ uri: avatarUri }}
                            style={[styles.avatar, { borderColor: theme.border, backgroundColor: theme.text }]}
                            contentFit="cover"
                        />
                    ) : (
                        <View
                            style={[
                                styles.avatar,
                                styles.avatarPlaceholder,
                                { backgroundColor: theme.surface, borderColor: theme.border },
                            ]}
                        >
                            <MaterialIcons name="photo-camera" size={32} color={theme.textInactive} />
                        </View>
                    )}
                </TouchableOpacity>
            </Field>

            {/* Erreur API globale (esthétique) */}
            {apiError && (
                <View
                    style={[
                        styles.apiErrorContainer,
                        { backgroundColor: theme.error + '22', borderColor: theme.error },
                    ]}
                >
                    <MaterialIcons name="error-outline" size={18} color={theme.error} />
                    <Text style={[styles.apiErrorText, { color: theme.error }]}>{apiError}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
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
        padding: 12,
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
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    error: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 8,
    },
    avatar: {
        width: 100,
        aspectRatio: 1,
        borderRadius: 20,
        borderWidth: 2,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    apiErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginHorizontal: 12,
        marginBottom: 12,
        gap: 8,
    },
    apiErrorText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    submitBtn: {
        borderRadius: 999,
        paddingVertical: 14,
        marginHorizontal: 12,
        alignItems: 'center',
    },
    submitText: {
        fontWeight: '600',
        fontSize: 16,
    },
});

export default UserForm;