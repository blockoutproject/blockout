import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";

import {
  borderWidth,
  fontWeight,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { RawDivisionMappingResponse } from "@/src/shared/generated/models";

type RawDivisionMappingItemProps = {
  mapping: RawDivisionMappingResponse;
  onPress: () => void;
};

const RawDivisionMappingItem: React.FC<RawDivisionMappingItemProps> = ({
  mapping,
  onPress,
}) => {
  const theme = useAppTheme();

  const hasDivision = Boolean(mapping.divisionId);
  const hasFormat = Boolean(mapping.format);
  const hasGender = Boolean(mapping.gender);

  const filledCount = [hasDivision, hasFormat, hasGender].filter(
    Boolean,
  ).length;

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
      accessibilityRole="button"
      accessibilityLabel={`Modifier ${mapping.rawDivisionName}`}
      testID={`raw-division-mapping-item-${mapping.id}`}
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
          { borderColor: statusColor, backgroundColor: statusColor + "10" },
        ]}
      >
        <Text style={[styles.status, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default RawDivisionMappingItem;

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    borderRadius: radius.lg,
    marginBottom: spacing[3],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftContent: { flex: 1, marginRight: spacing[3] },
  label: {
    fontWeight: fontWeight.bold,
    fontSize: typography.control.fontSize,
  },
  subLabel: {
    fontSize: typography.metadata.fontSize,
    marginTop: spacing[1],
  },
  statusWrapper: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing.tight,
    borderWidth: borderWidth.thin,
    borderRadius: radius.lg,
  },
  status: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.bold,
  },
});
