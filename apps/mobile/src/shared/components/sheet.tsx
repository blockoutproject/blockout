import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/** Supplies native presentation and an opaque themed host to the owning layout's Stack.Screen before navigation.
 * Deep-linkable hosts also export unstable_settings.anchor for their owning background route.
 * https://docs.expo.dev/router/advanced/stack/#statically-configure-route-options
 */
export function useSheetScreenOptions() {
  const { colors } = useTheme();
  return {
    presentation: "formSheet",
    headerShown: false,
    sheetAllowedDetents: "fitToContents",
    sheetGrabberVisible: true,
    sheetCornerRadius: tokens.radius.sheet,
    sheetElevation: 0,
    contentStyle: { backgroundColor: colors.surface },
  } as const;
}

/** Dismissible route content in an anchored native stack; owners retain fields/footer and draft/commit decisions. */
export interface SheetProps extends PropsWithChildren {
  title: string;
  message?: string;
  footer?: ReactNode;
}

/** Keeps form and footer in the native host's root ScrollView; the owning layout applies useSheetScreenOptions. */
export function Sheet({ title, message, footer, children }: SheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <ScrollView
      style={[
        styles.sheet,
        { backgroundColor: colors.surface, maxHeight: height - insets.top },
      ]}
      nestedScrollEnabled
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.body,
        { paddingBottom: footer ? 0 : tokens.spacing.section },
      ]}
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
      {footer && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, tokens.spacing.lg) },
          ]}
        >
          {footer}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flexShrink: 1 },
  body: {
    paddingTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.section,
  },
  introduction: { gap: tokens.spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.heading, flex: 1 },
  closeIcon: { width: tokens.size.actionIcon, height: tokens.size.actionIcon },
  message: tokens.typography.body,
  footer: {
    paddingTop: tokens.spacing.sm,
  },
});
