import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Empty content has contextual public copy; it never represents an unsuccessful read. */
export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Feature-owned decorative illustration; omitted consumers use the shared volleyball artwork. */
  artwork?: ReactNode;
}

/** Shared empty-state anatomy; the feature supplies contextual copy and any approved illustration. */
export function EmptyState({ title, description, artwork }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.raised, borderColor: colors.border },
      ]}
    >
      {artwork ?? (
        <View style={[styles.artwork, { backgroundColor: colors.subtle }]}>
          <Image
            accessible={false}
            source={require("../../../assets/feedback/volleyball.svg")}
            contentFit="contain"
            style={styles.illustration}
          />
        </View>
      )}
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: colors.secondaryText }]}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg - tokens.borderWidth,
    paddingVertical: tokens.spacing.section - tokens.borderWidth,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
  },
  title: { ...tokens.typography.heading, textAlign: "center" },
  description: { ...tokens.typography.body, textAlign: "center" },
  artwork: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.panelInset,
    overflow: "hidden",
  },
  illustration: { width: 64, height: 64 },
});
