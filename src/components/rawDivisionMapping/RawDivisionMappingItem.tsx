import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { RawDivisionMapping } from '@/src/types/RawDivisionMapping';
import ConfigApi from '@/src/api/ConfigApi';
import { EnumFormat, FormatLabels } from '@/src/types/enums/Format';
import { EnumGender, GenderLabels } from '@/src/types/enums/Gender';
import { DivisionCodeLabels, EnumDivisionCode } from '@/src/types/enums/DivisionCode';

type Props = {
    mapping: RawDivisionMapping;
    onUpdated: () => void;
};

const RawDivisionMappingItem: React.FC<Props> = ({ mapping, onUpdated }) => {
    const theme = useAppTheme();

    const [divisionCode, setDivisionCode] = useState(mapping.divisionCode || '');
    const [format, setFormat] = useState<EnumFormat | ''>(mapping.format || '');
    const [gender, setGender] = useState<EnumGender | ''>(mapping.gender || '');
    const [loadingField, setLoadingField] = useState<null | 'divisionCode' | 'format' | 'gender'>(null);

    const updateField = async (field: 'divisionCode' | 'format' | 'gender', value: string) => {
        setLoadingField(field);
        try {
            const api = ConfigApi.getInstance();
            const payload = { [field]: value === '' ? null : value };
            await api.updateRawDivisionMapping(mapping.id, payload);
            onUpdated();
        } finally {
            setLoadingField(null);
        }
    };

    const isFullyMapped = divisionCode && format && gender;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isFullyMapped ? '#1B5E20' : theme.surface, // vert foncé si complet
                },
            ]}
        >
            <Text style={[styles.label, { color: theme.text }]}>{mapping.rawDivisionName}</Text>
            <Text style={[styles.subLabel, { color: theme.textInactive }]}>
                {mapping.leagueCode} - {mapping.season}
            </Text>

            <View style={styles.row}>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={format}
                        onValueChange={(val) => {
                            setFormat(val);
                            updateField('format', val);
                        }}
                        style={{ color: theme.text }}
                    >
                        <Picker.Item label="Format" value="" color={theme.textInactive} />
                        {Object.values(EnumFormat).map((val) => (
                            <Picker.Item key={val} label={FormatLabels[val]} value={val} color={theme.text} />
                        ))}
                    </Picker>
                    {loadingField === 'format' && (
                        <ActivityIndicator size="small" color={theme.textInactive} style={styles.loaderSmall} />
                    )}
                </View>

                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={gender}
                        onValueChange={(val) => {
                            setGender(val);
                            updateField('gender', val);
                        }}
                        style={{ color: theme.text }}
                    >
                        <Picker.Item label="Genre" value="" color={theme.textInactive} />
                        {Object.values(EnumGender).map((val) => (
                            <Picker.Item key={val} label={GenderLabels[val]} value={val} color={theme.text} />
                        ))}
                    </Picker>
                    {loadingField === 'gender' && (
                        <ActivityIndicator size="small" color={theme.textInactive} style={styles.loaderSmall} />
                    )}
                </View>
            </View>

            <View style={styles.singleRow}>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={divisionCode}
                        onValueChange={(val) => {
                            setDivisionCode(val);
                            updateField('divisionCode', val);
                        }}
                        style={{ color: theme.text }}
                    >
                        <Picker.Item label="Division" value="" color={theme.textInactive} />
                        {Object.values(EnumDivisionCode).map((val) => (
                            <Picker.Item key={val} label={DivisionCodeLabels[val]} value={val} color={theme.text} />
                        ))}
                    </Picker>
                    {loadingField === 'divisionCode' && (
                        <ActivityIndicator size="small" color={theme.textInactive} style={styles.loaderSmall} />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    label: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 4,
    },
    subLabel: {
        fontSize: 14,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
    },
    singleRow: {
        flexDirection: 'row',
    },
    pickerWrapper: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
        height: 40,
        justifyContent: 'center',
    },
    loaderSmall: {
        position: 'absolute',
        right: 8,
        top: 12,
    },
});

export default RawDivisionMappingItem;