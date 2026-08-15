import React from "react";
import {
  StyleSheet,
  StyleSheet as RNStyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  iconSize,
  fontWeight,
  radius,
  spacing,
  typography,
  withAlpha,
} from "@/src/shared/theme";
import type { AppTheme } from "@/src/shared/theme";

const Medal: React.FC<{ rank: 1 | 2 | 3; theme: AppTheme }> = ({
  rank,
  theme,
}) => {
  const color =
    rank === 1 ? theme.gold : rank === 2 ? theme.silver : theme.bronze;

  return (
    <View
      style={[
        styles.medalWrap,
        { backgroundColor: withAlpha(color, 0.22), borderColor: color },
      ]}
    >
      <MaterialCommunityIcons
        name="medal"
        size={iconSize.compact}
        color={theme.text}
      />
      <Text style={[styles.medalRank, { color: theme.text }]}>{rank}</Text>
    </View>
  );
};

export default Medal;

const styles = StyleSheet.create({
  medalWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.optical,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: RNStyleSheet.hairlineWidth,
  },
  medalRank: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.extraBold,
  },
});
