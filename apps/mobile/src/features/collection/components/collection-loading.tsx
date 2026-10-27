import { StyleSheet, View } from "react-native";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Product Design 6019:46573: two decorative destination rows while the season catalogue is unknown. */
export function CollectionLoading() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement des collectes"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={styles.rows}
    >
      <DestinationLoading />
      <DestinationLoading />
    </View>
  );
}

/** The approved icon and two labels communicate navigation shape without inventing a destination. */
function DestinationLoading() {
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
      <Skeleton width={44} height={44} shape="rectangle" />
      <View style={styles.copy}>
        <Skeleton width={130} />
        <Skeleton height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: tokens.spacing.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    padding: tokens.spacing.lg - tokens.border.thin,
    gap: tokens.spacing.md,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.md },
});
