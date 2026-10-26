import { StyleSheet, View } from "react-native";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Product Design 950:9501 compact list variant: two non-interactive rows with proportional text tracks. */
export function DivisionsLoading() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement des divisions"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={styles.rows}
    >
      <DivisionLoading />
      <DivisionLoading />
    </View>
  );
}

/** The two visible tracks preserve the approved compact catalogue anatomy. */
function DivisionLoading() {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Skeleton width="50%" />
      <Skeleton width="80%" />
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: tokens.spacing.md },
  card: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
});
