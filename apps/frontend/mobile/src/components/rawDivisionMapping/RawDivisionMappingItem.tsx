import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { RawDivisionMapping } from "@/src/types/RawDivisionMapping";

type RawDivisionMappingItemProps = {
    mapping: RawDivisionMapping;
    onPress: () => void;
};

const RawDivisionMappingItem: React.FC<RawDivisionMappingItemProps> = ({ mapping, onPress }) => {
    const theme = useAppTheme();

    const hasDivision = Boolean(mapping.divisionId);
    const hasFormat = Boolean(mapping.format);
    const hasGender = Boolean(mapping.gender);

    const filledCount = [hasDivision, hasFormat, hasGender].filter(Boolean).length;

    let statusColor = theme.error;
    let statusLabel = "Non mappé";

    if (filledCount === 3) {
        statusColor = theme.success;
        statusLabel = "Mappé";
    } else if (filledCount > 0) {
        statusColor = theme.textSecondary;
        statusLabel = "Partiel";
    }

    const handlePress = () => {
        Haptics.selectionAsync();
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.85}
            style={[styles.container, { backgroundColor: theme.surface }]}
        >
            <View style={styles.leftContent}>
                <Text style={[styles.label, { color: theme.text }]} numberOfLines={2} ellipsizeMode="tail">
                    {mapping.rawDivisionName}
                </Text>
                <Text style={[styles.subLabel, { color: theme.textInactive }]}>
                    {mapping.leagueCode} - {mapping.season}
                </Text>
            </View>

            <View
                style={[
                    styles.statusWrapper,
                    { borderColor: statusColor, backgroundColor: statusColor + "10" },
                ]}
            >
                <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
            </View>
        </TouchableOpacity>
    );
};

export default RawDivisionMappingItem;

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    leftContent: { flex: 1, marginRight: 12 },
    label: { fontWeight: "700", fontSize: 16 },
    subLabel: { fontSize: 12, marginTop: 4 },
    statusWrapper: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderRadius: 16,
    },
    status: { fontSize: 12, fontWeight: "700" },
});