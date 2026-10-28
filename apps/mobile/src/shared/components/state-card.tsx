import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { Button } from "./button";
import { TECHNICAL_ERROR_TITLE, TECHNICAL_ERROR_HELP } from "./error-copy";

/** Empty content has contextual public copy; it never represents an unsuccessful read. */
export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Feature-owned decorative illustration; omitted consumers use the shared volleyball artwork. */
  artwork?: ReactNode;
  children?: ReactNode;
}

/** Shared empty-state anatomy; the feature supplies contextual copy and any approved illustration. */
export function EmptyState({
  title,
  description,
  artwork,
  children,
}: EmptyStateProps) {
  return (
    <StateCard
      kind="empty"
      title={title}
      description={description}
      artwork={artwork}
    >
      {children}
    </StateCard>
  );
}

/** Opaque failed-read presentation; only the owning read may offer and execute another attempt. */
export interface ErrorStateProps {
  onRetry?: () => void;
  retrying?: boolean;
}

/** Restores the approved illustrated card without exposing transport, permission or provider details. */
export function ErrorState({ onRetry, retrying = false }: ErrorStateProps) {
  return (
    <StateCard
      kind="error"
      title={TECHNICAL_ERROR_TITLE}
      description={TECHNICAL_ERROR_HELP}
    >
      {onRetry && (
        <Button label="Réessayer" onPress={onRetry} loading={retrying} />
      )}
    </StateCard>
  );
}

/** Preserves the approved artwork slots and opaque content-sized surface; placement belongs to ScreenState. */
function StateCard({
  kind,
  title,
  description,
  artwork,
  children,
}: EmptyStateProps & { kind: "empty" | "error" }) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: scheme === "dark" ? colors.surface : colors.raised,
          borderColor: colors.border,
        },
      ]}
    >
      {artwork ?? (
        <View
          style={[
            styles.artwork,
            kind === "error" ? styles.errorArtwork : styles.emptyArtwork,
            { backgroundColor: colors.subtle },
          ]}
        >
          <Image
            accessible={false}
            source={require("../../../assets/feedback/volleyball.svg")}
            contentFit="contain"
            style={styles.illustration}
          />
        </View>
      )}
      <Text
        accessibilityRole={kind === "error" ? "alert" : "header"}
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
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: tokens.layout.width.compact,
    alignSelf: "center",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg - tokens.border.thin,
    paddingVertical: tokens.spacing["2xl"] - tokens.border.thin,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
  },
  title: { ...tokens.typography.heading, textAlign: "center" },
  description: { ...tokens.typography.body, textAlign: "center" },
  actions: { maxWidth: "100%", alignSelf: "center" },
  emptyArtwork: { width: 120, height: 120 },
  errorArtwork: { width: 86, height: 78 },
  artwork: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.panelInset,
    overflow: "hidden",
  },
  illustration: { width: 64, height: 64 },
});
