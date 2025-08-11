import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ActivityIndicator,
    Text,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { RawDivisionMapping } from '@/src/types/RawDivisionMapping';
import ConfigApi from '@/src/api/ConfigApi';
import { useDivisions } from '@/src/hooks/config/division/useDivisions';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { EnumFormat, FormatLabels } from '@/src/types/enums/Format';
import { EnumGender, GenderLabels } from '@/src/types/enums/Gender';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type RawDivisionMappingFormProps = {
    mapping: RawDivisionMapping;
    onSuccess: () => void;
};

const RawDivisionMappingForm: React.FC<RawDivisionMappingFormProps> = ({ mapping, onSuccess }) => {
    const theme = useAppTheme();
    const inset = useSafeAreaInsets();
    const { data: divisions = [], isLoading: loadingDivisions } = useDivisions();

    const [divisionId, setDivisionId] = useState<number | ''>(mapping.divisionId || '');
    const [format, setFormat] = useState<EnumFormat | ''>(mapping.format || '');
    const [gender, setGender] = useState<EnumGender | ''>(mapping.gender || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await ConfigApi.getInstance().updateRawDivisionMapping(mapping.id, {
                divisionId: divisionId === '' ? null : divisionId,
                format: format === '' ? null : format,
                gender: gender === '' ? null : gender,
            });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
        } catch (error) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setErrorMessage("Une erreur est survenue lors de la sauvegarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BottomSheetView
            style={[
                styles.container,
                {
                    paddingBottom: inset.bottom,
                    backgroundColor: theme.backgroundSecondary,
                },
            ]}
        >
            <Text style={[styles.label, { color: theme.text }]}>
                {mapping.rawDivisionName}
            </Text>

            {/* Format + Genre */}
            <View style={styles.row}>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={format}
                        onValueChange={(value) => {
                            setFormat(value);
                        }}
                        itemStyle={{
                            color: theme.text,
                            fontSize: 18,
                        }}
                    >
                        <Picker.Item label="Format" value="" color={theme.textInactive} />
                        {Object.values(EnumFormat).map((val) => (
                            <Picker.Item key={val} label={FormatLabels[val]} value={val} />
                        ))}
                    </Picker>
                </View>

                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={gender}
                        onValueChange={(value) => {
                            setGender(value);
                        }}
                        itemStyle={{
                            color: theme.text,
                            fontSize: 18,
                        }}
                    >
                        <Picker.Item label="Genre" value="" color={theme.textInactive} />
                        {Object.values(EnumGender).map((val) => (
                            <Picker.Item key={val} label={GenderLabels[val]} value={val} />
                        ))}
                    </Picker>
                </View>
            </View>

            {/* Division */}
            <View style={styles.row}>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={divisionId}
                        onValueChange={(value) => {
                            setDivisionId(value);
                        }}
                        enabled={!loadingDivisions}
                        itemStyle={{
                            color: theme.text,
                            fontSize: 18,
                        }}
                    >
                        <Picker.Item label="Division" value="" color={theme.textInactive} />
                        {divisions.filter((division) => division.active).map((d) => (
                            <Picker.Item key={d.id} label={d.name} value={d.id} />
                        ))}
                    </Picker>
                    {loadingDivisions && <ActivityIndicator size="small" />}
                </View>
            </View>

            {/* Erreur API */}
            {errorMessage && (
                <View
                    style={[
                        styles.apiErrorContainer,
                        { backgroundColor: theme.error + '22', borderColor: theme.error },
                    ]}
                >
                    <MaterialIcons name="error-outline" size={18} color={theme.error} />
                    <Text style={[styles.apiErrorText, { color: theme.error }]}>
                        {errorMessage}
                    </Text>
                </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
                style={[
                    styles.submitButton,
                    {
                        backgroundColor: theme.success,
                        opacity: isSubmitting ? 0.7 : 1,
                    },
                ]}
            >
                {isSubmitting ? (
                    <ActivityIndicator color={theme.text} />
                ) : (
                    <Text style={[styles.submitText, { color: theme.text }]}>Enregistrer</Text>
                )}
            </TouchableOpacity>
        </BottomSheetView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    pickerWrapper: {
        flex: 1,
        overflow: 'hidden',
        height: 50,
        justifyContent: 'center',
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
    submitButton: {
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

export default RawDivisionMappingForm;