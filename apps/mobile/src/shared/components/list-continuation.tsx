import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { RequestLoading } from "./request-feedback";

/** Feature owners retain the cursor, data, request guards and retry; this footer only presents their state. */
export interface ListContinuationProps {
  loading: boolean;
  failed: boolean;
  disabled?: boolean;
  onRetry: () => void;
}

/** Keeps pending and failed continuation at the same list edge without replacing already loaded rows. */
export function ListContinuation({
  loading,
  failed,
  disabled,
  onRetry,
}: ListContinuationProps) {
  const { colors } = useTheme();
  if (loading) return <RequestLoading />;
  if (!failed) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLiveRegion="polite"
      disabled={disabled}
      onPress={onRetry}
      style={({ pressed }) => [
        styles.retry,
        {
          opacity: disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
        },
      ]}
    >
      <Text style={[tokens.typography.metadata, { color: colors.text }]}>
        Une erreur est survenue. <Text style={styles.action}>Réessayer.</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  retry: { minHeight: tokens.touch.minimum, justifyContent: "center" },
  action: { textDecorationLine: "underline" },
});
