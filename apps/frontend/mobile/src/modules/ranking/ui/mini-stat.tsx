import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { withAlpha } from "@/src/shared/lib/utils";
import {
  borderWidth,
  radius,
  spacing,
  typography,
  type AppTheme,
} from "@/src/shared/theme";

const MiniStat: React.FC<{
  label: string;
  value: number | string;
  theme: AppTheme;
}> = ({ label, value, theme }) => (
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
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    minHeight: 22,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  miniStatLabel: typography.captionStrong,
  miniStatValue: typography.metadataStrong,
});
