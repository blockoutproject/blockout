import { StyleSheet } from "react-native";
import { tokens } from "../theme/tokens";
import { Skeleton } from "./skeleton";
import { Surface } from "./surface";

/** Neutral structural read skeleton; known content uses its feature shape and the caller owns blocking placement. */
export function RequestLoading() {
  return (
    <Surface
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement en cours"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={styles.loading}
    >
      <Skeleton width="62%" height={16} />
      <Skeleton height={11} />
      <Skeleton width="54%" height={11} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  loading: {
    width: "100%",
    maxWidth: tokens.layout.width.compact,
    gap: tokens.spacing.compact,
  },
});
