import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";

type Props = { label: string };

const InfoPill: React.FC<Props> = memo(({ label }) => {
    const theme = useAppTheme();
    return (
        <View
            style={[
                styles.pill,
                { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
        >
            <Text style={[styles.pillText, { color: theme.text }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
});

export default InfoPill;

const styles = StyleSheet.create({
    pill: {
        borderRadius: CORNERS,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    pillText: {
        fontSize: 12,
        fontWeight: "700",
    },
});