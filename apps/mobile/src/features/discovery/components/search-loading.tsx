import { resultBadgeSize } from "./search-result-card";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { Skeleton } from "../../../shared/components/skeleton";

/** Product Design 952:14506: two static decorative cards announce one pending read, never fictional results. */
export function SearchLoading() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement en cours"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={styles.cards}
    >
      <LoadingCard />
      <LoadingCard />
    </View>
  );
}

/** Keeps the approved identity and metadata skeleton geometry independent of remote data or animation. */
function LoadingCard() {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.identity}>
        <Skeleton
          width={tokens.size.media.entity}
          height={tokens.size.media.entity}
        />
        <View style={styles.copy}>
          <Skeleton />
          <Skeleton width={140} height={12} />
        </View>
      </View>
      <View style={styles.metadata}>
        <Skeleton width={96} height={resultBadgeSize} />
        <Skeleton width={76} height={resultBadgeSize} />
        <Skeleton width={52} height={resultBadgeSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: tokens.spacing.md },
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    // Figma's inside stroke is included in the 16-point outer inset.
    padding: tokens.spacing.lg - tokens.border.thin,
    gap: tokens.spacing.md,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.sm },
  metadata: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
});
