import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/**
 * Selects the native form-sheet presentation with its default height and gestures.
 * Owners apply these options before navigation and anchor directly linked sheets.
 */
export function useSheetScreenOptions() {
  const { colors } = useTheme();
  return {
    presentation: "formSheet",
    headerShown: false,
    contentStyle: { backgroundColor: colors.surface },
  } as const;
}

/**
 * Ordinary scrollable content for a native sheet, including its heading and optional final action.
 * Owners retain field state, validation, confirmation and draft/commit decisions.
 */
export interface SheetProps extends PropsWithChildren {
  title: string;
  message?: string;
  footer?: ReactNode;
}

/** Supplies form content while the native host owns presentation, sizing and dismissal gestures. */
export function Sheet({ title, message, footer, children }: SheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      nestedScrollEnabled
    >
      <View style={styles.introduction}>
        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            {title}
          </Text>
          <IconButton label="Fermer" onPress={() => router.back()}>
            <Image
              source={require("../../../assets/icons/close.svg")}
              style={styles.closeIcon}
              tintColor={colors.icon}
              contentFit="contain"
            />
          </IconButton>
        </View>
        {message && (
          <Text style={[styles.message, { color: colors.secondaryText }]}>
            {message}
          </Text>
        )}
      </View>
      {children}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.section },
  introduction: { gap: tokens.spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.heading, flex: 1 },
  closeIcon: { width: tokens.size.actionIcon, height: tokens.size.actionIcon },
  message: tokens.typography.body,
});
