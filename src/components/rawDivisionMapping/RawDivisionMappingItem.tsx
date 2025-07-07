import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { RawDivisionMapping } from '@/src/types/RawDivisionMapping';
import * as Haptics from 'expo-haptics';

type Props = {
    mapping: RawDivisionMapping;
    onPress: () => void;
};

const RawDivisionMappingItem: React.FC<Props> = ({ mapping, onPress }) => {
    const theme = useAppTheme();

    const isMapped = mapping.divisionId && mapping.format && mapping.gender;
    const statusColor = isMapped ? theme.success : theme.error;
    const statusLabel = isMapped ? 'Mappé' : 'Non mappé';

    const handlePress = () => {
        Haptics.selectionAsync();
        onPress();
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.surface }]}
            onPress={handlePress}
            activeOpacity={0.85}
        >
            <View style={styles.leftContent}>
                <Text
                    style={[styles.label, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {mapping.rawDivisionName}
                </Text>
                <Text style={[styles.subLabel, { color: theme.textInactive }]}>
                    {mapping.leagueCode} - {mapping.season}
                </Text>
            </View>

            <View
                style={[
                    styles.statusWrapper,
                    {
                        borderColor: statusColor,
                        backgroundColor: statusColor + '10',
                    },
                ]}
            >
                <Text style={[styles.status, { color: statusColor }]}>
                    {statusLabel}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftContent: {
        flex: 1,
        marginRight: 12,
    },
    label: {
        fontWeight: '600',
        fontSize: 16,
    },
    subLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    statusWrapper: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderRadius: 16,
    },
    status: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default RawDivisionMappingItem;