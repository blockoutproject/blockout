import { StyleSheet, View } from "react-native";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Product Design 5487:61148: pending identity only, without a name, protected action or fabricated profile. */
export function ProfileLoading() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement du profil"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.card,
        { backgroundColor: colors.raised, borderColor: colors.border },
      ]}
    >
      <View style={[styles.artwork, { backgroundColor: colors.skeleton }]} />
      <View style={styles.identity}>
        <Skeleton width={72} height={10} />
        <Skeleton width={144} />
        <Skeleton height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    height: 156 + tokens.borderWidth * 2,
    gap: tokens.spacing.md,
    paddingRight: tokens.spacing.md,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    overflow: "hidden",
  },
  artwork: { width: 84, alignSelf: "stretch" },
  identity: { flex: 1, minWidth: 0, gap: tokens.spacing.md },
});
