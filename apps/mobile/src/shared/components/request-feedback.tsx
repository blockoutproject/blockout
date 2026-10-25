import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { Button } from "./button";
import { LoadingIndicator } from "./loading-indicator";
import { TECHNICAL_ERROR } from "./error-copy";

// UI Library content slots: Spinner 212:11, Error State 216:25–27 and Button 156:5.
// These are inline feedback, not a projection of the complete elevated Error State card.
// The owner supplies its surrounding surface, retained content and navigation.

/** Announces indeterminate waiting independently of the shared reduced-motion-aware glyph. */
export function RequestLoading() {
  const { colors, context } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement en cours"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={styles.loading}
    >
      <LoadingIndicator color={context.primary} />
      <Text style={[styles.message, { color: colors.text }]}>
        Chargement en cours
      </Text>
    </View>
  );
}

/** Presentation inputs only; owners translate failures and decide whether another attempt is allowed. */
export interface RequestErrorProps {
  /** Safe French presentation copy, never a raw transport/provider error. */
  message?: string;
  /** Omit when recovery is unavailable or unsafe; invoked only by the explicit action. */
  onRetry?: () => void;
  /** The caller owns the attempt lifecycle; true keeps the same action busy and unavailable. */
  retrying?: boolean;
}

/** Keeps the error before its optional action in native reading order, without moving focus or executing work. */
export function RequestError({
  message = TECHNICAL_ERROR,
  onRetry,
  retrying = false,
}: RequestErrorProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.error}>
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.message, { color: colors.text }]}
      >
        {message}
      </Text>
      {onRetry && (
        <Button label="Réessayer" onPress={onRetry} loading={retrying} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  error: { gap: tokens.spacing.md },
  message: { ...tokens.typography.body, flexShrink: 1 },
});
