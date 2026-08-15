import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  iconSize,
  borderWidth,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { ScraperStatusResponse } from "@/src/shared/generated/models";

interface Props {
  scraper: ScraperStatusResponse;
  onToggle: () => void;
}

const ScraperStatusItem: React.FC<Props> = ({ scraper, onToggle }) => {
  const theme = useAppTheme();
  const isEnabled = scraper.enabled;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: isEnabled ? theme.success : theme.border,
        },
      ]}
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityLabel={`${isEnabled ? "Désactiver" : "Activer"} ${scraper.name}`}
      accessibilityState={{ checked: isEnabled }}
      testID={`administration-scraper-${scraper.name}`}
    >
      <View style={styles.leftBlock}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isEnabled
                ? theme.success
                : theme.borderSecondary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isEnabled ? "cloud-check-outline" : "cloud-off-outline"}
            size={iconSize.control}
            color={theme.background}
          />
        </View>

        <View style={styles.textWrapper}>
          <Text style={[styles.name, { color: theme.text }]}>
            {scraper.name}
          </Text>
          <View style={styles.chipRow}>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: isEnabled
                    ? `${theme.success}22`
                    : `${theme.error}22`,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isEnabled ? theme.success : theme.error,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isEnabled ? theme.success : theme.error,
                  },
                ]}
              >
                {isEnabled ? "Activé" : "Désactivé"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.rightBlock}>
        <MaterialCommunityIcons
          name="chevron-right"
          size={iconSize.card}
          color={theme.textInactive}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.hero,
    paddingVertical: spacing.inset,
    paddingHorizontal: spacing.inset,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: borderWidth.subtle,
  },
  leftBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.compact,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    flexDirection: "column",
    flex: 1,
  },
  name: {
    fontSize: typography.bodyStrong.fontSize,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing[1],
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tight,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    gap: spacing.tight,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: typography.caption.fontSize,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: letterSpacing.overline,
  },
  rightBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tight,
    marginLeft: spacing[3],
  },
});

export default ScraperStatusItem;
