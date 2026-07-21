// ScraperStatusItem.tsx
import React from "react";
import {StyleSheet, Text, TouchableOpacity, View,} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/context/ThemeProvider";
import {ScraperStatus} from "@/src/types/ScraperStatus";

interface Props {
  scraper: ScraperStatus;
  onToggle: () => void;
}

const ScraperStatusItem: React.FC<Props> = ({scraper, onToggle}) => {
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
            size={18}
            color={theme.background}
          />
        </View>

        <View style={styles.textWrapper}>
          <Text style={[styles.name, {color: theme.text}]}>
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
                    backgroundColor: isEnabled
                      ? theme.success
                      : theme.error,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isEnabled
                      ? theme.success
                      : theme.error,
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
          size={22}
          color={theme.textInactive}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
  },
  leftBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    flexDirection: "column",
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  rightBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 12,
  },
});

export default ScraperStatusItem;
