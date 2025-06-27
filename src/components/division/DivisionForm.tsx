import React from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Button } from 'react-native';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Division } from '@/src/types/Division';
import ConfigApi from '@/src/api/ConfigApi';
import CircleColorPicker from '../common/CircleColorPicker';

interface DivisionFormProps {
    division: Division | null;
    onSuccess: () => void;
}

const DivisionForm: React.FC<DivisionFormProps> = ({ division, onSuccess }) => {
    const theme = useAppTheme();

    const isEditMode = !!division;

    const formik = useFormik({
        initialValues: {
            name: division?.name || '',
            mainColor: division?.mainColor || '',
            firstGradientColor: division?.firstGradientColor || '',
            secondGradientColor: division?.secondGradientColor || '',
            thirdGradientColor: division?.thirdGradientColor || '',
            profileImageUrl: division?.profileImageUrl || '',
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Le nom est requis'),
            mainColor: Yup.string().required('Couleur principale requise'),
        }),
        onSubmit: async (values) => {
            try {
                const api = ConfigApi.getInstance();
                if (isEditMode) {
                    await api.updateDivision(division!.id, values);
                } else {
                    await api.createOrUpdateDivision(values);
                }
                onSuccess();
            } catch (error) {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la sauvegarde.');
                console.error(error);
            }
        },
    });

    const renderTextInput = (label: string, field: keyof typeof formik.values) => (
        <>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formik.values[field]}
                onChangeText={formik.handleChange(field)}
                onBlur={formik.handleBlur(field)}
            />
            {formik.touched[field] && formik.errors[field] && (
                <Text style={styles.error}>{formik.errors[field]}</Text>
            )}
        </>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
            {renderTextInput('Nom', 'name')}

            <Text style={[styles.label, { color: theme.text }]}>Couleur principale</Text>
            <View style={styles.row}>
                <CircleColorPicker
                    value={formik.values.mainColor}
                    onChange={(color) => formik.setFieldValue('mainColor', color)}
                />
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Dégradé</Text>
            <View style={styles.row}>
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

            {renderTextInput('Image de profil (URL)', 'profileImageUrl')}

            <View style={styles.buttonRow}>
                <View style={styles.button}>
                    <Button title={isEditMode ? (!division.active ? 'Réactiver' : 'Modifier') : 'Créer'} onPress={formik.handleSubmit as any} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: 12,
    },
    error: {
        color: 'red',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginVertical: 16,
    },
    button: {
        flex: 1,
        marginHorizontal: 4,
    },
});

export default DivisionForm;