import { StyleSheet, View } from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

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
  const fill = { backgroundColor: colors.skeleton };
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
        <View style={[styles.logo, fill]} />
        <View style={styles.copy}>
          <View style={[styles.title, fill]} />
          <View style={[styles.subtitle, fill]} />
        </View>
      </View>
      <View style={styles.metadata}>
        <View style={[styles.badge, { width: 96 }, fill]} />
        <View style={[styles.badge, { width: 76 }, fill]} />
        <View style={[styles.badge, { width: 52 }, fill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: tokens.spacing.md },
  card: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    // Figma's inside stroke is included in the 16-point outer inset.
    padding: tokens.spacing.lg - tokens.borderWidth,
    gap: tokens.spacing.md,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  logo: {
    width: tokens.size.entityMedia,
    height: tokens.size.entityMedia,
    borderRadius: tokens.radius.badge,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.sm },
  title: { height: 16, borderRadius: tokens.radius.badge },
  subtitle: {
    width: 140,
    maxWidth: "100%",
    height: 12,
    borderRadius: tokens.radius.badge,
  },
  metadata: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  badge: { height: tokens.size.badge, borderRadius: tokens.radius.badge },
});
