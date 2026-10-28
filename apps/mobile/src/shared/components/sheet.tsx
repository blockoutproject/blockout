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
} as const;

/** Short contextual content without text entry; the caller owns choices, actions and dismissal. */
export interface SheetProps extends PropsWithChildren {
  onClose: () => void;
  /** Holds the native presenter while the owning confirmed action is in progress. */
  closeDisabled?: boolean;
  title: string;
  message?: string;
  /** Disable for compact content in a native fitToContents route; its root keeps its natural height. */
  scrollable?: boolean;
  /** Supply only when the scrollable sheet displays remote data; static choices have no refresh gesture. */
  refreshControl?: ScrollViewProps["refreshControl"];
}

/** Supplies system bottom spacing and either scrolling or natural-height content for its native route. */
export function Sheet({
  onClose,
  closeDisabled = false,
  title,
  message,
  scrollable = true,
  refreshControl,
  children,
}: SheetProps) {
  const { colors } = useTheme();
  const content = (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.content, !scrollable && styles.compactContent]}
    >
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

  if (!scrollable)
    return <View style={{ backgroundColor: colors.surface }}>{content}</View>;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.scrollContent}
      alwaysBounceVertical
      refreshControl={refreshControl}
      nestedScrollEnabled
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.layout.section.gap },
  // Product Design's 24-point handle area + 8-point header inset; the grabber is drawn by the native route.
  compactContent: {
    paddingTop: tokens.spacing["2xl"] + tokens.spacing.sm,
    paddingBottom: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  introduction: { gap: tokens.spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.heading, flex: 1 },
  message: tokens.typography.body,
});
