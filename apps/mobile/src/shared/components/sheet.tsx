import { X } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/** Register these options in the owning Expo Router layout before opening a sheet route. */
export const sheetScreenOptions = {
  presentation: "formSheet",
  headerShown: false,
  sheetGrabberVisible: true,
  sheetAllowedDetents: "fitToContents",
} as const;

/** Intrinsic contextual content; callers compose SheetContent and retain their own close, refresh and command state. */
export interface SheetProps extends PropsWithChildren {
  onClose: () => void;
  /** Holds the native presenter while the owning confirmed action is in progress. */
  closeDisabled?: boolean;
  title: string;
  message?: string;
  /** Supply only when the scrollable sheet displays remote data; static choices have no refresh gesture. */
  refreshControl?: ScrollViewProps["refreshControl"];
}

/** The first scrolling descendant keeps natural content height; the native presenter owns its maximum and overflow. */
export function Sheet({
  onClose,
  closeDisabled = false,
  title,
  message,
  refreshControl,
  children,
}: SheetProps) {
  const { colors } = useTheme();
  const content = (
    <SafeAreaView edges={["bottom"]}>
      <View style={styles.introduction}>
        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            accessibilityLabel={title}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.title, { color: colors.text }]}
          >
            {title}
          </Text>
          <IconButton label="Fermer" onPress={onClose} disabled={closeDisabled}>
            <X
              accessible={false}
              size={tokens.size.icon.lg}
              color={colors.icon}
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
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.surface }]}
      alwaysBounceVertical
      refreshControl={refreshControl}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {content}
    </ScrollView>
  );
}

/** Insets contextual content once; bounded lists group their rows inside this body without owning sheet geometry. */
export function SheetContent({ children }: PropsWithChildren) {
  return <View style={styles.sheetContent}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flexGrow: 0, flexShrink: 1 },
  sheetContent: {
    paddingTop: tokens.layout.section.gap,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
    gap: tokens.layout.section.gap,
  },
  // The native grabber owns its own handle; the title keeps the approved 24+8-point content clearance.
  introduction: {
    paddingTop: tokens.spacing["2xl"] + tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.heading, flex: 1 },
  message: tokens.typography.body,
});
