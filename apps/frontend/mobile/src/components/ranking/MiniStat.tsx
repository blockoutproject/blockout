import React from "react";
import { View, Text, StyleSheet, StyleSheet as RNStyleSheet } from "react-native";
import { withAlpha } from "@/src/utils/utils";

const MiniStat: React.FC<{ label: string; value: number | string; theme: any }> = ({
    label,
    value,
    theme,
}) => (
    <View style={[styles.miniStat, { borderColor: withAlpha(theme.text, 0.2) }]}>
        <Text style={[styles.miniStatLabel, { color: withAlpha(theme.text, 0.7) }]}>
            {label}
        </Text>
        <Text style={[styles.miniStatValue, { color: theme.text }]}>{value}</Text>
    </View>
);

export default MiniStat;

const styles = StyleSheet.create({
    miniStat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: RNStyleSheet.hairlineWidth,
    },
    miniStatLabel: { fontSize: 11, fontWeight: "700" },
    miniStatValue: { fontSize: 12, fontWeight: "800" },
});