import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/** Ordinary back navigation with an optional centered identity; direct entry returns home. */
export interface PageHeaderProps {
  title?: string;
  /** A composed compact identity may replace the plain title while preserving the balanced rails. */
  children?: ReactNode;
  /** An owner-supplied action remains available independently of the detail read. */
  action?: ReactNode;
}

/** UI Library Top Bar: equal control rails keep the title centered as native text grows. */
export function PageHeader({ title, children, action }: PageHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.rail}>
        <IconButton
          label="Retour"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          <ChevronLeft
            accessible={false}
            color={colors.icon}
            size={tokens.size.icon.lg}
          />
        </IconButton>
      </View>
      {children ? (
        <View
          accessible={Boolean(title)}
          accessibilityRole="header"
          accessibilityLabel={title}
          style={styles.middle}
        >
          {children}
        </View>
      ) : title ? (
        <Text
          accessibilityRole="header"
          accessibilityLabel={title}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}
      <View style={styles.rail}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.layout.header,
    paddingHorizontal: tokens.spacing.lg,
  },
  rail: { width: tokens.size.control.default, alignItems: "center" },
  middle: { flex: 1, minWidth: 0, alignItems: "center" },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
});
