import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { LoadingIndicator } from "./loading-indicator";

// Loading is content-sized; ScreenState owns blocking placement and existing skeletons remain feature-owned.

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

const styles = StyleSheet.create({
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  message: { ...tokens.typography.body, flexShrink: 1 },
});
