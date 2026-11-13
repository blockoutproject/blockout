import { controlOpacity } from "./control-styles";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Feature owners retain the cursor, data, request guards and retry; this footer only presents their state. */
export interface ListContinuationProps {
  loading: boolean;
  failed: boolean;
  disabled?: boolean;
  onRetry: () => void;
}

/** Presents continuation feedback without replacing the list or owning its request. */
export function ListContinuation({
  loading,
  failed,
  disabled,
  onRetry,
}: Readonly<ListContinuationProps>) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Chargement de la suite…"
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion="polite"
        style={styles.row}
      >
        <ActivityIndicator
          accessible={false}
          size="small"
          color={colors.secondaryText}
        />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            tokens.typography.metadata,
            styles.message,
            { color: colors.secondaryText },
          ]}
        >
          Chargement de la suite…
        </Text>
      </View>
    );
  }
  if (!failed) {
    return null;
  }
  return (
    <View style={styles.row}>
      <Text
        accessibilityLabel="Une erreur est survenue."
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          tokens.typography.metadata,
          styles.message,
          { color: colors.secondaryText },
        ]}
      >
        Une erreur est survenue.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retry,
          {
            opacity: controlOpacity(disabled, pressed),
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            tokens.typography.metadata,
            styles.action,
            { color: colors.text },
          ]}
        >
          Réessayer
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: tokens.layout.list.gap,
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  message: { flexShrink: 1, minWidth: 0 },
  retry: {
    flexShrink: 0,
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "center",
  },
  action: { textDecorationLine: "underline" },
});
