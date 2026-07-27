import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  borderWidth,
  colors,
  elevation,
  iconSize,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";

export type ClubInfoRowProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string | null;
  onPress?: () => void;
  isLink?: boolean;
  testID: string;
};

export const InfoRow: React.FC<ClubInfoRowProps> = ({
  icon,
  label,
  value,
  onPress,
  isLink,
  testID,
}) => {
  const theme = useAppTheme();
  if (!value) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${label} : ${value}` : undefined}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{
        color: withAlpha(theme.text, 0.06),
      }}
      style={({ pressed }) => [
        styles.row,
        pressed
          ? {
              backgroundColor: withAlpha(theme.text, 0.03),
              transform: [{ scale: 0.996 }],
            }
          : null,
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: theme.text,
            borderColor: colors.ranking.silver,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={iconSize.sm}
          color={theme.textInactive}
        />
      </View>

      <View style={styles.rowText}>
        <Text
          style={[
            styles.label,
            {
              color: theme.text,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            {
              color: isLink ? theme.primary : theme.text,
            },
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>

      {onPress ? (
        <Ionicons
          name="chevron-forward-outline"
          size={20}
          color={withAlpha(theme.text, 0.5)}
          style={styles.chevron}
        />
      ) : null}
    </Pressable>
  );
};

export type ClubInfoCardProps = {
  title: string;
  children: React.ReactNode;
};

export const InfoCard: React.FC<ClubInfoCardProps> = ({ title, children }) => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.text,
        },
      ]}
      testID="club-info-card"
    >
      <Text
        style={[
          styles.cardTitle,
          {
            color: theme.text,
          },
        ]}
      >
        {title}
      </Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing[3],
    gap: spacing[2],
    borderWidth: borderWidth.thin,
    ...elevation.card,
  },
  cardTitle: {
    ...typography.compactStrong,
    textTransform: "uppercase",
  },
  cardBody: {
    gap: spacing[1],
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[2],
    borderRadius: radius.md,
    borderCurve: "continuous",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.thin,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...typography.captionStrong,
  },
  value: {
    ...typography.compactStrong,
  },
  chevron: {
    marginLeft: spacing[1],
  },
});
