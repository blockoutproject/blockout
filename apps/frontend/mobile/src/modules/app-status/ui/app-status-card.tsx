import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  borderWidth,
  letterSpacing,
  radius,
  spacing,
  touchTarget,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { Pill } from "@/src/shared/ui/pill";

export type AppStatusCardProps = React.PropsWithChildren<{
  statusLabel: string;
  statusIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  statusColor: string;
  title: string;
}>;

/** Groups the status label, title, and feature-owned gate content. */
export function AppStatusCard({
  statusLabel,
  statusIcon,
  statusColor,
  title,
  children,
}: AppStatusCardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Pill
          label={statusLabel}
          leftIcon={statusIcon}
          size="md"
          backgroundColor={theme.backgroundSecondary}
          borderColor={theme.border}
          textColor={statusColor}
          iconColor={statusColor}
          labelStyle={styles.statusLabel}
        />
        <Text
          style={[styles.title, { color: theme.text }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

export type AppStatusBypassActionProps = {
  onPress: () => void;
  testID: string;
};

/** Renders the explicit authorized bypass shared by both application gates. */
export function AppStatusBypassAction({
  onPress,
  testID,
}: AppStatusBypassActionProps) {
  const theme = useAppTheme();

  const handlePress = async () => {
    await Haptics.selectionAsync().catch(() => undefined);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.bypassAction,
        {
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Accéder à l’application"
      testID={testID}
    >
      <Text style={[styles.bypassLabel, { color: theme.textSecondary }]}>
        Accéder à l’application
      </Text>
    </Pressable>
  );
}

export const appStatusContentStyles = StyleSheet.create({
  illustration: {
    width: 250,
    height: 250,
    alignSelf: "center",
  },
  message: {
    ...typography.body,
    textAlign: "center",
  },
  messageGroup: {
    width: "100%",
    gap: spacing[1],
  },
  version: {
    ...typography.metadata,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: spacing[3],
  },
});

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 430,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    borderWidth: borderWidth.thin,
    padding: spacing[4],
    alignItems: "center",
    gap: spacing[4],
  },
  header: {
    width: "100%",
    alignItems: "flex-start",
    gap: spacing[2],
  },
  statusLabel: {
    textTransform: "uppercase",
    letterSpacing: letterSpacing.overline,
  },
  title: typography.title,
  bypassAction: {
    minHeight: touchTarget.minimum,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  bypassLabel: {
    ...typography.micro,
    textTransform: "uppercase",
    letterSpacing: letterSpacing.overline,
  },
});
