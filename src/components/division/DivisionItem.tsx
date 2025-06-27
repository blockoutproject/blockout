import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Division } from '@/src/types/Division';
import ConfigApi from '@/src/api/ConfigApi';
import { LinearGradient } from 'expo-linear-gradient';

interface DivisionItemProps {
    division: Division;
    onPress: () => void;
    onDeactivated: () => void;
}

const DivisionItem: React.FC<DivisionItemProps> = ({ division, onPress, onDeactivated }) => {
    const theme = useAppTheme();

    const handleDeactivate = async () => {
        try {
            await ConfigApi.getInstance().deactivateDivision(division.id);
            onDeactivated();
        } catch (error) {
            console.error('Erreur lors de la désactivation :', error);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[styles.id, { color: theme.textInactive }]}>#{division.id}</Text>

            {/* Name & status */}
            <View style={styles.textContainer}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {division.name}
                </Text>
                <Text
                    style={[
                        styles.status,
                        { color: division.active ? theme.success : theme.error },
                    ]}
                >
                    {division.active ? 'Active' : 'Inactive'}
                </Text>
            </View>

            {/* Main color circle */}
            <View
                style={[
                    styles.colorCircle,
                    {
                        backgroundColor: division.mainColor || '#ccc',
                        borderColor: theme.border,
                    },
                ]}
            />

            {/* Gradient circle */}
            <LinearGradient
                colors={[
                    division.firstGradientColor || '#000',
                    division.secondGradientColor || '#000',
                    division.thirdGradientColor || '#000',
                ]}
                style={[styles.colorCircle, { marginRight: 8 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Deactivate button */}
            {division.active && (
                <TouchableOpacity onPress={handleDeactivate}>
                    <MaterialCommunityIcons
                        name="close"
                        size={20}
                        color={theme.textInactive}
                        style={{ marginLeft: 16 }}
                    />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        padding: 12,
        marginBottom: 8,
    },
    id: {
        fontSize: 12,
        width: 40,
        textAlign: 'left',
    },
    textContainer: {
        flex: 1,
        paddingHorizontal: 8,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
    },
    status: {
        fontSize: 12,
        marginTop: 4,
    },
    colorCircle: {
        width: 30,
        height: 30,
        borderRadius: 20,
        marginHorizontal: 4,
        borderWidth: 1,
    },
});

export default DivisionItem;