import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Division } from '@/src/types/Division';
import ConfigApi from '@/src/api/ConfigApi';
import CircleColorPicker from '../common/CircleColorPicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import FastImage from 'react-native-fast-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

interface DivisionFormProps {
    division: Division | null;
    onSuccess: () => void;
}

const DivisionForm: React.FC<DivisionFormProps> = ({ division, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const isEditMode = !!division;

    const [imageFile, setImageFile] = React.useState<any | null>(null);
    const [previewUri, setPreviewUri] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handlePickImage = async () => {
        try {
            await Haptics.selectionAsync();

            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) {
                Alert.alert("Permission refusée", "Accès à la bibliothèque requis.");
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
                format: ImageManipulator.SaveFormat.JPEG,
                compress: 1,
            });

            const fileObj = {
                uri: saved.uri,
                name: `division.jpg`,
                type: 'image/jpeg',
            };

            setPreviewUri(saved.uri);
            setImageFile(fileObj);
        } catch (e) {
            console.error("Erreur image:", e);
            Alert.alert("Erreur", "Impossible de traiter l'image.");
        }
    };

    const formik = useFormik({
        initialValues: {
            name: division?.name || '',
            mainColor: division?.mainColor || '',
            firstGradientColor: division?.firstGradientColor || '',
            secondGradientColor: division?.secondGradientColor || '',
            thirdGradientColor: division?.thirdGradientColor || '',
            logoUrl: division?.logoUrl || '',
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Le nom est requis'),
            mainColor: Yup.string().required('Couleur principale requise'),
            firstGradientColor: Yup.string().required('Première couleur de dégradé requise'),
            secondGradientColor: Yup.string().required('Deuxième couleur de dégradé requise'),
            thirdGradientColor: Yup.string().required('Troisième couleur de dégradé requise'),
        }),

        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                setLoading(true);
                setErrorMessage(null);

                const api = ConfigApi.getInstance();
                if (isEditMode) {
                    await api.updateDivision(division!.id, values, imageFile ?? undefined);
                } else {
                    await api.createOrUpdateDivision(values, imageFile ?? undefined);
                }

                onSuccess();
            } catch (error: any) {
                console.error('Erreur API:', error);
                setErrorMessage('La sauvegarde a échoué. Veuillez réessayer.');
            } finally {
                setLoading(false);
            }
        },
    });

    const imageUri = previewUri ?? formik.values.logoUrl;

    return (
        <BottomSheetView style={[styles.container, { backgroundColor: theme.backgroundSecondary, paddingBottom: insets.bottom }]}>
            <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: theme.text }]}>Nom</Text>
                <BottomSheetTextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={formik.values.name}
                    onChangeText={formik.handleChange('name')}
                    placeholder="Nom de la division"
                    placeholderTextColor={theme.textInactive}
                />
                {formik.touched.name && formik.errors.name && (
                    <Text style={styles.error}>{formik.errors.name}</Text>
                )}
            </View>

            <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: theme.text }]}>Couleur principale</Text>
                <View style={styles.colorRow}>
                    <CircleColorPicker
                        value={formik.values.mainColor}
                        onChange={(color) => formik.setFieldValue('mainColor', color)}
                    />
                </View>
                {formik.touched.mainColor && formik.errors.mainColor && (
                    <Text style={styles.error}>{formik.errors.mainColor}</Text>
                )}
            </View>

            <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: theme.text }]}>Dégradé</Text>
                <View style={styles.colorRow}>
                    <CircleColorPicker
                        value={formik.values.firstGradientColor}
                        onChange={(color) => formik.setFieldValue('firstGradientColor', color)}
                    />
                    <CircleColorPicker
                        value={formik.values.secondGradientColor}
                        onChange={(color) => formik.setFieldValue('secondGradientColor', color)}
                    />
                    <CircleColorPicker
                        value={formik.values.thirdGradientColor}
                        onChange={(color) => formik.setFieldValue('thirdGradientColor', color)}
                    />
                </View>
                {formik.touched.firstGradientColor && formik.errors.firstGradientColor && (
                    <Text style={styles.error}>{formik.errors.firstGradientColor}</Text>
                )}
                {formik.touched.secondGradientColor && formik.errors.secondGradientColor && (
                    <Text style={styles.error}>{formik.errors.secondGradientColor}</Text>
                )}
                {formik.touched.thirdGradientColor && formik.errors.thirdGradientColor && (
                    <Text style={styles.error}>{formik.errors.thirdGradientColor}</Text>
                )}
            </View>

            <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: theme.text }]}>Image de profil</Text>
                <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.imageTouch}>
                    {imageUri ? (
                        <FastImage source={{ uri: imageUri }} style={[styles.imagePreview, { borderColor: theme.border }]} />
                    ) : (
                        <View style={[styles.imagePreview, styles.imagePlaceholder, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <MaterialIcons name="photo-camera" size={28} color={theme.textInactive} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {errorMessage && (
                <Text style={styles.apiError}>{errorMessage}</Text>
            )}

            <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: formik.values.mainColor || theme.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={() => formik.handleSubmit()}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator color={theme.text} />
                ) : (
                    <Text style={[styles.submitText, { color: theme.text }]}>
                        {isEditMode
                            ? !division?.active
                                ? 'Réactiver'
                                : 'Modifier'
                            : 'Créer'}
                    </Text>
                )}
            </TouchableOpacity>
        </BottomSheetView>
    );
};

const styles = StyleSheet.create({
    container: { 
        padding: 12 
    },
    fieldBlock: { 
        marginBottom: 20 
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
        marginTop: 6,
        marginLeft: 8,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
        marginLeft: 8,
    },
    imageTouch: {
        alignSelf: 'flex-start',
        marginTop: 8,
        marginLeft: 8,
    },
    imagePreview: {
        width: 80,
        aspectRatio: 1,
        borderRadius: 18,
        borderWidth: 2,
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButton: {
        borderRadius: 12,
        paddingVertical: 14,
        marginHorizontal: 12,
        alignItems: 'center',
    },
    submitText: {
        fontWeight: '600',
        fontSize: 16,
    },
    apiError: {
        color: 'red',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 12,
    },
});

export default DivisionForm;