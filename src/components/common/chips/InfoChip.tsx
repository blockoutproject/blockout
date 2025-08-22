import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";

export const INFOCHIP_METRICS = {
    vpad: 6,
    hpad: 10,
    gap: 6,
    radius: 999,
    border: StyleSheet.hairlineWidth,
    fontSize: 12 as const,
    fontWeight: "800" as const,
};

type Props = {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    label: string;
    maxWidth?: number;
};

const InfoChip: React.FC<Props> = memo(({ icon, label, maxWidth }) => {
    const theme = useAppTheme();
    return (
        <View
            style={[
                styles.chipOuter,
                { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: INFOCHIP_METRICS.border },
                maxWidth ? { maxWidth } : null,
            ]}
        >
            <View style={styles.chipInner}>
                <MaterialCommunityIcons name={icon} size={14} color={theme.text} />
                <Text style={[styles.chipText, { color: theme.text }]} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        </View>
    );
});

export default InfoChip;

const styles = StyleSheet.create({
    chipOuter: {
        borderRadius: INFOCHIP_METRICS.radius,
        overflow: "hidden",
    },
    chipInner: {
        flexDirection: "row",
        alignItems: "center",
        gap: INFOCHIP_METRICS.gap,
        paddingVertical: INFOCHIP_METRICS.vpad,
        paddingHorizontal: INFOCHIP_METRICS.hpad,
    },
    chipText: {
        fontSize: INFOCHIP_METRICS.fontSize,
        fontWeight: INFOCHIP_METRICS.fontWeight,
    },
});