import { Image } from "expo-image";
import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/** Register these options in the owning Expo Router layout before opening a sheet route. */
export const sheetScreenOptions = {
  presentation: "formSheet",
  headerShown: false,
  sheetGrabberVisible: true,
} as const;

/** Short contextual content without text entry; the caller owns choices, actions and dismissal. */
export interface SheetProps extends PropsWithChildren {
  onClose: () => void;
  title: string;
  message?: string;
}

/** Keeps short content and its actions in native scrolling, with system bottom spacing. */
export function Sheet({ onClose, title, message, children }: SheetProps) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.surface }]}
      nestedScrollEnabled
    >
      <SafeAreaView edges={["bottom"]} style={styles.content}>
        <View style={styles.introduction}>
          <View style={styles.titleRow}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
            <IconButton label="Fermer" onPress={onClose}>
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
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
